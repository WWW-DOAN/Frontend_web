import { useCallStore } from "../store/useCallStore";
import { callService } from "../service/call-service";
import { sendSocketMessage } from "../socket/socket";
import { getcurrentUserId } from "../utilities/utils";
import { Device } from "mediasoup-client";

let currentUserId: string | null = null;
let localStream: MediaStream | null = null;
let iceServers: RTCIceServer[] = [];
let device: Device | null = null;
let sendTransport: any = null;
let recvTransport: any = null;
let sfuWs: WebSocket | null = null;

const sfuProducers: Map<string, any> = new Map();
const sfuConsumers: Map<string, any> = new Map();

export function initCallUser() {
  currentUserId = getcurrentUserId();
}

async function loadIceServers(): Promise<RTCIceServer[]> {
  try {
    const config = await callService.getIceServers();
    iceServers = config.iceServers || [];
  } catch {
    iceServers = [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ];
  }
  return iceServers;
}

async function getLocalStream(video: boolean): Promise<MediaStream> {
  if (localStream) return localStream;
  localStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: video ? { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24 } } : false,
  });
  return localStream;
}

function cleanupLocalStream() {
  if (localStream) {
    localStream.getTracks().forEach((t) => t.stop());
    localStream = null;
  }
}

function cleanupSfu() {
  for (const [, consumer] of sfuConsumers) {
    try { consumer.close(); } catch {}
  }
  sfuConsumers.clear();

  for (const [, producer] of sfuProducers) {
    try { producer.close(); } catch {}
  }
  sfuProducers.clear();

  if (sendTransport) {
    try { sendTransport.close(); } catch {}
    sendTransport = null;
  }

  if (recvTransport) {
    try { recvTransport.close(); } catch {}
    recvTransport = null;
  }

  if (sfuWs) {
    try { sfuWs.close(); } catch {}
    sfuWs = null;
  }

  device = null;
}

function getSfuWsUrl(roomId: string, peerId: string): string {
  const envUrl = process.env.NEXT_PUBLIC_SOCKET_URL || (typeof window !== "undefined" ? window.location.origin : "http://localhost:4321");
  const wsBase = envUrl.replace(/^http:/, "ws:").replace(/^https:/, "wss:").replace(/\/ws\/?$/, "");
  const token = typeof window !== "undefined" ? (localStorage.getItem("accessToken") || "") : "";
  return `${wsBase}/sfu/ws?token=${token}&roomId=${roomId}&peerId=${peerId}`;
}

async function connectSfuWs(roomId: string, peerId: string): Promise<WebSocket> {
  if (sfuWs) {
    try { sfuWs.close(); } catch {}
    sfuWs = null;
  }

  const url = getSfuWsUrl(roomId, peerId);
  const ws = new WebSocket(url);
  sfuWs = ws;

  return new Promise((resolve, reject) => {
    let resolved = false;

    ws.onopen = () => {
      resolved = true;
      console.log("[SFU-WS] Connected successfully to room:", roomId);
      resolve(ws);
    };

    ws.onerror = (err) => {
      console.error("[SFU-WS] WebSocket error:", err);
      if (!resolved) {
        resolved = true;
        reject(err);
      }
    };

    ws.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case "room-joined": {
            console.log("[SFU-WS] Joined room, existing peers:", msg.peers);
            if (Array.isArray(msg.peers)) {
              msg.peers.forEach((pId: string) => {
                if (pId !== currentUserId) {
                  useCallStore.getState().addPeerStream({
                    peerId: pId,
                    userId: pId,
                    displayName: pId,
                    audio: null,
                    video: null,
                    audioMuted: false,
                    videoMuted: false,
                  });
                }
              });
            }
            break;
          }

          case "peer-joined": {
            console.log("[SFU-WS] Peer joined:", msg.peerId);
            if (msg.peerId !== currentUserId) {
              useCallStore.getState().addPeerStream({
                peerId: msg.peerId,
                userId: msg.userId || msg.peerId,
                displayName: msg.displayName || msg.peerId,
                audio: null,
                video: null,
                audioMuted: false,
                videoMuted: false,
              });
            }
            break;
          }

          case "peer-left": {
            console.log("[SFU-WS] Peer left:", msg.peerId);
            useCallStore.getState().removePeerStream(msg.peerId);
            break;
          }

          case "new-consumer": {
            console.log("[SFU-WS] new-consumer announced:", msg);
            await consumeProducer(roomId, msg.producerId, msg.peerId, msg.kind);
            break;
          }

          case "active-speaker": {
            useCallStore.getState().setSpeaking(msg.peerId === currentUserId);
            break;
          }
        }
      } catch (err) {
        console.warn("[SFU-WS] Failed to handle message:", err);
      }
    };

    ws.onclose = () => {
      console.log("[SFU-WS] Connection closed for room:", roomId);
      if (sfuWs === ws) {
        sfuWs = null;
      }
    };
  });
}

async function setupTransports(roomId: string) {
  if (!device) throw new Error("Mediasoup device not initialized");

  // 1. Create send transport
  const sendParams = await callService.createSfuTransport(roomId, currentUserId!, "send");
  sendTransport = device.createSendTransport({
    id: sendParams.transportId,
    iceParameters: sendParams.iceParameters,
    iceCandidates: sendParams.iceCandidates,
    dtlsParameters: sendParams.dtlsParameters,
    iceServers,
  });

  sendTransport.on("connect", async ({ dtlsParameters }: any, callback: any, errback: any) => {
    try {
      await callService.connectSfuTransport(roomId, sendTransport.id, dtlsParameters);
      callback();
    } catch (err: any) {
      console.error("[SFU] Connect send transport error:", err);
      errback(err);
    }
  });

  sendTransport.on("produce", async ({ kind, rtpParameters, appData }: any, callback: any, errback: any) => {
    try {
      const res = await callService.produce(roomId, sendTransport.id, kind, rtpParameters, {
        ...appData,
        peerId: currentUserId,
      });
      callback({ id: res.producerId });
    } catch (err: any) {
      console.error("[SFU] Produce track error:", err);
      errback(err);
    }
  });

  // 2. Create recv transport
  const recvParams = await callService.createSfuTransport(roomId, currentUserId!, "recv");
  recvTransport = device.createRecvTransport({
    id: recvParams.transportId,
    iceParameters: recvParams.iceParameters,
    iceCandidates: recvParams.iceCandidates,
    dtlsParameters: recvParams.dtlsParameters,
    iceServers,
  });

  recvTransport.on("connect", async ({ dtlsParameters }: any, callback: any, errback: any) => {
    try {
      await callService.connectSfuTransport(roomId, recvTransport.id, dtlsParameters);
      callback();
    } catch (err: any) {
      console.error("[SFU] Connect recv transport error:", err);
      errback(err);
    }
  });
}

async function produceTracks(stream: MediaStream, roomId: string) {
  if (!sendTransport || !device) return;

  const audioTrack = stream.getAudioTracks()[0];
  if (audioTrack && device.canProduce("audio")) {
    try {
      const audioProducer = await sendTransport.produce({
        track: audioTrack,
        appData: { peerId: currentUserId, kind: "audio" },
      });
      sfuProducers.set("audio", audioProducer);
      notifyProducerReady(roomId, audioProducer.id, "audio");
    } catch (e) {
      console.error("[SFU] Failed to produce audio track:", e);
    }
  }

  const videoTrack = stream.getVideoTracks()[0];
  if (videoTrack && device.canProduce("video")) {
    try {
      const videoProducer = await sendTransport.produce({
        track: videoTrack,
        appData: { peerId: currentUserId, kind: "video" },
      });
      sfuProducers.set("video", videoProducer);
      notifyProducerReady(roomId, videoProducer.id, "video");
    } catch (e) {
      console.error("[SFU] Failed to produce video track:", e);
    }
  }
}

function notifyProducerReady(roomId: string, producerId: string, kind: "audio" | "video") {
  if (sfuWs && sfuWs.readyState === WebSocket.OPEN) {
    sfuWs.send(
      JSON.stringify({
        type: "new-consumer",
        producerId,
        peerId: currentUserId,
        kind,
      })
    );
  }
}

async function consumeProducer(
  roomId: string,
  producerId: string,
  peerId: string,
  kind: "audio" | "video"
) {
  if (!recvTransport || !device) return;
  if (peerId === currentUserId) return;
  if (sfuConsumers.has(producerId)) return;

  try {
    const consumeResult = await callService.consume(
      roomId,
      recvTransport.id,
      producerId,
      device.rtpCapabilities
    );

    if (!consumeResult?.consumerId) return;

    const consumer = await recvTransport.consume({
      id: consumeResult.consumerId,
      producerId: consumeResult.producerId,
      kind: consumeResult.kind,
      rtpParameters: consumeResult.rtpParameters,
    });

    sfuConsumers.set(producerId, consumer);
    await callService.resumeConsumer(roomId, consumer.id);

    const stream = new MediaStream([consumer.track]);

    consumer.on("transportclose", () => {
      sfuConsumers.delete(producerId);
    });

    consumer.on("producerclose", () => {
      sfuConsumers.delete(producerId);
      consumer.close();
    });

    const targetPeerId = peerId || `peer-${producerId}`;
    useCallStore.getState().addOrUpdatePeerStream({
      peerId: targetPeerId,
      userId: targetPeerId,
      displayName: targetPeerId,
      audio: kind === "audio" ? stream : null,
      video: kind === "video" ? stream : null,
      audioMuted: false,
      videoMuted: false,
    });
  } catch (err) {
    console.error(`[SFU] Error consuming producer ${producerId}:`, err);
  }
}

async function fetchAndConsumeExistingProducers(roomId: string) {
  try {
    const res = await callService.getSfuProducers(roomId);
    if (res?.producers && Array.isArray(res.producers)) {
      for (const p of res.producers) {
        if (p.peerId !== currentUserId) {
          await consumeProducer(roomId, p.id, p.peerId || "", p.kind);
        }
      }
    }
  } catch (err) {
    console.warn("[SFU] Failed to fetch existing producers:", err);
  }
}

export async function startGroupCall(conversationId: string) {
  const store = useCallStore.getState();
  if (store.active) return;

  initCallUser();

  try {
    useCallStore.getState().setStarting(true);

    const res = await callService.createGroupCall(conversationId);
    const roomId = res.session.sfuRoomId;
    const sessionId = res.session.id;

    useCallStore.getState().initiateCall({
      callId: sessionId,
      conversationId,
      type: "GROUP",
    });
    useCallStore.getState().setSfuRoomId(roomId);
    useCallStore.getState().setSessionId(sessionId);
    useCallStore.getState().setConnecting();

    await loadIceServers();
    const stream = await getLocalStream(true);

    const roomInfo = await callService.createSfuRoom(roomId, conversationId);
    device = new Device();
    await device.load({ routerRtpCapabilities: roomInfo.routerRtpCapabilities });

    await setupTransports(roomId);
    await connectSfuWs(roomId, currentUserId || `user-${Date.now()}`);

    sendSocketMessage("/app/sfu.join", {
      conversation_id: conversationId,
      sfu_room_id: roomId,
    });

    useCallStore.getState().setConnected(stream);
    await produceTracks(stream, roomId);
    await fetchAndConsumeExistingProducers(roomId);
  } catch (err: any) {
    console.error("[startGroupCall] error:", err);
    useCallStore.getState().setError(err.message || "Không thể khởi tạo cuộc gọi nhóm");
    cleanupLocalStream();
    cleanupSfu();
    useCallStore.getState().resetCall();
  } finally {
    useCallStore.getState().setStarting(false);
  }
}

export async function handleIncomingGroupCall(
  conversationId: string,
  sessionId: string,
  sfuRoomId: string
) {
  initCallUser();

  try {
    useCallStore.getState().setAnswering(true);
    await callService.joinGroupCall(conversationId, sessionId);

    useCallStore.getState().setConnecting();
    useCallStore.getState().setSfuRoomId(sfuRoomId);
    useCallStore.getState().setSessionId(sessionId);

    await loadIceServers();
    const stream = await getLocalStream(true);

    const roomInfo = await callService.getSfuRoom(sfuRoomId);
    device = new Device();
    await device.load({ routerRtpCapabilities: roomInfo.routerRtpCapabilities });

    await setupTransports(sfuRoomId);
    await connectSfuWs(sfuRoomId, currentUserId || `user-${Date.now()}`);

    sendSocketMessage("/app/sfu.join", {
      conversation_id: conversationId,
      sfu_room_id: sfuRoomId,
    });

    useCallStore.getState().setConnected(stream);
    await produceTracks(stream, sfuRoomId);
    await fetchAndConsumeExistingProducers(sfuRoomId);
  } catch (err: any) {
    console.error("[handleIncomingGroupCall] error:", err);
    useCallStore.getState().setError(err.message || "Không thể tham gia cuộc gọi nhóm");
    cleanupLocalStream();
    cleanupSfu();
    useCallStore.getState().resetCall();
  } finally {
    useCallStore.getState().setAnswering(false);
  }
}

export async function endGroupCall(conversationId?: string, sessionId?: string) {
  const store = useCallStore.getState();
  const cId = conversationId || store.conversationId;
  const sId = sessionId || store.sessionId;
  const rId = store.sfuRoomId;

  useCallStore.getState().setEnding(true);

  try {
    if (cId && sId) {
      await callService.leaveGroupCall(cId, sId).catch(() => {});
    }
    if (cId && rId) {
      sendSocketMessage("/app/sfu.leave", {
        conversation_id: cId,
        sfu_room_id: rId,
      });
    }
  } catch (err) {
    console.warn("[endGroupCall] error:", err);
  } finally {
    cleanupLocalStream();
    cleanupSfu();
    useCallStore.getState().setEnded();
    useCallStore.getState().setEnding(false);
    setTimeout(() => {
      useCallStore.getState().resetCall();
    }, 500);
  }
}

export function toggleGroupAudio(enabled: boolean) {
  if (localStream) {
    localStream.getAudioTracks().forEach((t) => (t.enabled = enabled));
  }
  const audioProducer = sfuProducers.get("audio");
  if (audioProducer) {
    if (enabled) {
      audioProducer.resume().catch(console.warn);
    } else {
      audioProducer.pause().catch(console.warn);
    }
  }
}

export function toggleGroupVideo(enabled: boolean) {
  if (localStream) {
    localStream.getVideoTracks().forEach((t) => (t.enabled = enabled));
  }
  const videoProducer = sfuProducers.get("video");
  if (videoProducer) {
    if (enabled) {
      videoProducer.resume().catch(console.warn);
    } else {
      videoProducer.pause().catch(console.warn);
    }
  }
}

export async function replaceGroupVideoTrack(newTrack: MediaStreamTrack) {
  const videoProducer = sfuProducers.get("video");
  if (videoProducer) {
    try {
      await videoProducer.replaceTrack({ track: newTrack });
    } catch (e) {
      console.warn("[SFU] Replace video track error:", e);
    }
  }
}

export function handleSfuSignal(data: any) {
  const store = useCallStore.getState();
  if (!store.active || store.type !== "GROUP") return;

  switch (data.type) {
    case "sfu-peer-joined":
      if (data.sender_id && data.sender_id !== currentUserId) {
        useCallStore.getState().addPeerStream({
          peerId: data.sender_id,
          userId: data.sender_id,
          displayName: data.sender_id,
          audio: null,
          video: null,
          audioMuted: false,
          videoMuted: false,
        });
      }
      break;

    case "sfu-peer-left":
      if (data.sender_id) {
        useCallStore.getState().removePeerStream(data.sender_id);
      }
      break;

    case "sfu-active-speaker":
      useCallStore.getState().setSpeaking(data.active_peer_id === currentUserId);
      break;
  }
}
