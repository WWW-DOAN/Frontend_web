import { useCallStore } from "../store/useCallStore";
import { useChatStore } from "../store/useChatStore";
import { callService } from "../service/call-service";
import { userService } from "../service/user-service";
import { sendSocketMessage, subscribeToConversation } from "../socket/socket";
import { getcurrentUserId } from "../utilities/utils";
import { Device } from "mediasoup-client";

let currentUserId: string | null = null;
let localStream: MediaStream | null = null;
let iceServers: RTCIceServer[] = [];
let device: Device | null = null;
let sendTransport: any = null;
let recvTransport: any = null;
let sfuWs: WebSocket | null = null;
let activeRoomId: string | null = null;

const sfuProducers: Map<string, any> = new Map();
const sfuConsumers: Map<string, any> = new Map();
const fetchingUserProfiles = new Set<string>();

function getActiveUserId(): string | null {
  if (!currentUserId) {
    currentUserId = getcurrentUserId();
  }
  return currentUserId || getcurrentUserId();
}

export function initCallUser() {
  currentUserId = getcurrentUserId();
}

function resolveMemberProfile(
  conversationId: string | null,
  peerOrUserId: string
): { userId: string; displayName: string; avatarUrl: string | null } {
  const userId = (peerOrUserId || "").split("_")[0] || peerOrUserId;
  const chatState = useChatStore.getState();
  const detailMembers = conversationId
    ? chatState.conversationDetailById?.[conversationId]?.members
    : undefined;
  const listMembers = conversationId
    ? chatState.listConversation.find((c) => c.id === conversationId)?.members
    : undefined;
  const members = (detailMembers?.length ? detailMembers : listMembers) as any[] | undefined;

  const found = members?.find((m) => (m.userId || m.id) === userId);
  const displayName =
    found?.displayName || found?.fullName || found?.username || found?.nickname || "";
  const avatarUrl = found?.avatarUrl || null;

  if (!displayName && userId && !fetchingUserProfiles.has(userId)) {
    fetchingUserProfiles.add(userId);
    userService
      .getUserById(userId)
      .then((res) => {
        if (res?.ok) {
          const user = (res.payload as any)?.data ?? res.payload;
          if (user) {
            const resolvedName = user.displayName || user.fullName || user.username || "Thành viên";
            useCallStore.getState().updatePeerStream(peerOrUserId, {
              displayName: resolvedName,
              avatarUrl: user.avatarUrl || null,
            });
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        fetchingUserProfiles.delete(userId);
      });
  }

  return {
    userId,
    displayName: displayName || "Thành viên",
    avatarUrl,
  };
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
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: video ? { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24 } } : false,
    });
  } catch (err) {
    if (video) {
      console.warn("[GroupCall] Camera unavailable, falling back to audio-only:", err);
      localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      useCallStore.getState().setVideoMuted(true);
    } else {
      throw err;
    }
  }
  return localStream;
}

function cleanupLocalStream() {
  if (localStream) {
    localStream.getTracks().forEach((t) => t.stop());
    localStream = null;
  }
}

function cleanupSfu() {
  activeRoomId = null;
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
            const myId = getActiveUserId();
            const convId = useCallStore.getState().conversationId;
            if (Array.isArray(msg.peers)) {
              msg.peers.forEach((pId: string) => {
                if (pId !== myId && pId !== peerId) {
                  const profile = resolveMemberProfile(convId, pId);
                  useCallStore.getState().addPeerStream({
                    peerId: pId,
                    userId: profile.userId,
                    displayName: profile.displayName,
                    avatarUrl: profile.avatarUrl,
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
            const myId = getActiveUserId();
            const convId = useCallStore.getState().conversationId;
            if (msg.peerId !== myId && msg.peerId !== peerId) {
              const profile = resolveMemberProfile(convId, msg.peerId);
              useCallStore.getState().addPeerStream({
                peerId: msg.peerId,
                userId: msg.userId || profile.userId,
                displayName: msg.displayName || profile.displayName,
                avatarUrl: profile.avatarUrl,
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

          case "peer-media-state": {
            if (msg.peerId) {
              useCallStore.getState().updatePeerStream(msg.peerId, {
                audioMuted: !!msg.audioMuted,
                videoMuted: !!msg.videoMuted,
              });
            }
            break;
          }

          case "active-speaker": {
            useCallStore.getState().setSpeaking(msg.peerId === getActiveUserId());
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
  const myId = getActiveUserId() || `user-${Date.now()}`;

  // 1. Create send transport
  const sendParams = await callService.createSfuTransport(roomId, myId, "send");
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
        peerId: getActiveUserId(),
      });
      callback({ id: res.producerId });
    } catch (err: any) {
      console.error("[SFU] Produce track error:", err);
      errback(err);
    }
  });

  // 2. Create recv transport
  const recvParams = await callService.createSfuTransport(roomId, myId, "recv");
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
  const myId = getActiveUserId();

  const audioTrack = stream.getAudioTracks()[0];
  if (audioTrack && device.canProduce("audio")) {
    try {
      const audioProducer = await sendTransport.produce({
        track: audioTrack,
        appData: { peerId: myId, kind: "audio" },
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
        appData: { peerId: myId, kind: "video" },
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
        peerId: getActiveUserId(),
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
  const myId = getActiveUserId();
  if (peerId === myId) return;
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
    const targetPeerId = peerId || `peer-${producerId}`;
    const convId = useCallStore.getState().conversationId;
    const existingPeer = useCallStore.getState().peerStreams.find((p) => p.peerId === targetPeerId);
    const profile = resolveMemberProfile(convId, targetPeerId);

    consumer.on("transportclose", () => {
      sfuConsumers.delete(producerId);
    });

    consumer.on("producerclose", () => {
      sfuConsumers.delete(producerId);
      consumer.close();
      useCallStore.getState().updatePeerStream(targetPeerId, kind === "video" ? { video: null, videoMuted: true } : { audio: null, audioMuted: true });
    });

    useCallStore.getState().addOrUpdatePeerStream({
      peerId: targetPeerId,
      userId: existingPeer?.userId || profile.userId,
      displayName: existingPeer?.displayName || profile.displayName,
      avatarUrl: existingPeer?.avatarUrl ?? profile.avatarUrl,
      audio: kind === "audio" ? stream : (existingPeer?.audio ?? null),
      video: kind === "video" ? stream : (existingPeer?.video ?? null),
      audioMuted: kind === "audio" ? false : (existingPeer?.audioMuted ?? false),
      videoMuted: kind === "video" ? false : (existingPeer?.videoMuted ?? false),
    });
  } catch (err) {
    console.error(`[SFU] Error consuming producer ${producerId}:`, err);
  }
}

async function fetchAndConsumeExistingProducers(roomId: string) {
  const myId = getActiveUserId();
  try {
    const res = await callService.getSfuProducers(roomId);
    if (res?.producers && Array.isArray(res.producers)) {
      for (const p of res.producers) {
        if (p.peerId !== myId) {
          await consumeProducer(roomId, p.id, p.peerId || "", p.kind);
        }
      }
    }
  } catch (err) {
    console.warn("[SFU] Failed to fetch existing producers:", err);
  }
}

export async function startGroupCall(conversationId: string, callType: "AUDIO" | "VIDEO" = "AUDIO") {
  const store = useCallStore.getState();
  if (store.active) return;

  initCallUser();

  try {
    useCallStore.getState().setStarting(true);

    const res = await callService.createGroupCall(conversationId, callType);
    let session = (res as any)?.session || (res as any)?.payload?.session || (res as any)?.data?.session;

    if (!session || !session.sfuRoomId) {
      const activeRes = await callService.getActiveGroupCall(conversationId).catch(() => null);
      session = (activeRes as any)?.session || (activeRes as any)?.payload?.session || (activeRes as any)?.data?.session;
    }

    if (!session || !session.sfuRoomId) {
      const errMsg = (res as any)?.message || (res as any)?.payload?.message || "Không thể khởi tạo cuộc gọi nhóm";
      throw new Error(errMsg);
    }

    const resolvedCallType: "AUDIO" | "VIDEO" = session.type === "VIDEO" ? "VIDEO" : callType;
    const roomId = session.sfuRoomId;
    const sessionId = session.id;
    activeRoomId = roomId;

    subscribeToConversation(conversationId);
    useCallStore.getState().initiateCall({
      callId: sessionId,
      conversationId,
      type: "GROUP",
      groupCallType: resolvedCallType,
    });
    useCallStore.getState().setSfuRoomId(roomId);
    useCallStore.getState().setSessionId(sessionId);
    useCallStore.getState().setConnecting();

    await loadIceServers();
    const stream = await getLocalStream(resolvedCallType === "VIDEO");
    if (resolvedCallType === "AUDIO") {
      useCallStore.getState().setVideoMuted(true);
    }

    const roomInfo = await callService.createSfuRoom(roomId, conversationId);
    device = new Device();
    await device.load({ routerRtpCapabilities: roomInfo.routerRtpCapabilities });

    await setupTransports(roomId);
    await connectSfuWs(roomId, getActiveUserId() || `user-${Date.now()}`);

    sendSocketMessage("/app/sfu.join", {
      conversation_id: conversationId,
      sfu_room_id: roomId,
    });

    useCallStore.getState().setConnected(stream);
    await produceTracks(stream, roomId);
    await fetchAndConsumeExistingProducers(roomId);
    window.dispatchEvent(new CustomEvent("group-call:updated", { detail: { conversation_id: conversationId } }));
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
  sfuRoomId: string,
  callType: "AUDIO" | "VIDEO" = "AUDIO"
) {
  initCallUser();

  try {
    useCallStore.getState().setAnswering(true);
    subscribeToConversation(conversationId);
    const joinRes: any = await callService.joinGroupCall(conversationId, sessionId).catch((err) => {
      console.warn("[joinGroupCall] non-fatal:", err);
      return null;
    });

    const resolvedCallType: "AUDIO" | "VIDEO" =
      joinRes?.session?.type === "VIDEO" || callType === "VIDEO" ? "VIDEO" : "AUDIO";

    activeRoomId = sfuRoomId;
    useCallStore.getState().setGroupCallType(resolvedCallType);
    useCallStore.getState().setVideoMuted(resolvedCallType === "AUDIO");
    useCallStore.getState().setConnecting();
    useCallStore.getState().setSfuRoomId(sfuRoomId);
    useCallStore.getState().setSessionId(sessionId);

    await loadIceServers();
    const stream = await getLocalStream(resolvedCallType === "VIDEO");
    if (resolvedCallType === "AUDIO") {
      useCallStore.getState().setVideoMuted(true);
    }

    let roomInfo = await callService.getSfuRoom(sfuRoomId).catch(() => null);
    if (!roomInfo || !roomInfo.routerRtpCapabilities) {
      roomInfo = await callService.createSfuRoom(sfuRoomId, conversationId);
    }
    device = new Device();
    await device.load({ routerRtpCapabilities: roomInfo.routerRtpCapabilities });

    await setupTransports(sfuRoomId);
    await connectSfuWs(sfuRoomId, getActiveUserId() || `user-${Date.now()}`);

    sendSocketMessage("/app/sfu.join", {
      conversation_id: conversationId,
      sfu_room_id: sfuRoomId,
    });

    useCallStore.getState().setConnected(stream);
    await produceTracks(stream, sfuRoomId);
    await fetchAndConsumeExistingProducers(sfuRoomId);
    window.dispatchEvent(new CustomEvent("group-call:updated", { detail: { conversation_id: conversationId } }));
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
    if (cId) {
      window.dispatchEvent(new CustomEvent("group-call:updated", { detail: { conversation_id: cId } }));
    }
    setTimeout(() => {
      useCallStore.getState().resetCall();
    }, 500);
  }
}

function broadcastGroupMediaState(audioMuted: boolean, videoMuted: boolean) {
  if (sfuWs && sfuWs.readyState === WebSocket.OPEN) {
    sfuWs.send(
      JSON.stringify({
        type: "media-state",
        peerId: getActiveUserId(),
        audioMuted,
        videoMuted,
      })
    );
  }
}

export function toggleGroupAudio(enabled: boolean) {
  if (localStream) {
    localStream.getAudioTracks().forEach((t) => (t.enabled = enabled));
  }
  const audioProducer = sfuProducers.get("audio");
  if (audioProducer) {
    try {
      if (enabled) {
        audioProducer.resume();
      } else {
        audioProducer.pause();
      }
    } catch (e) {
      console.warn("[SFU] toggleGroupAudio producer error:", e);
    }
  }
  useCallStore.getState().setAudioMuted(!enabled);
  broadcastGroupMediaState(!enabled, useCallStore.getState().videoMuted);
}

export async function toggleGroupVideo(enabled: boolean) {
  const store = useCallStore.getState();
  if (enabled) {
    const existingTracks = localStream?.getVideoTracks() || [];
    const existingProducer = sfuProducers.get("video");
    if (existingTracks.length > 0 && existingProducer) {
      existingTracks.forEach((t) => (t.enabled = true));
      try {
        existingProducer.resume();
      } catch (e) {
        console.warn("[SFU] toggleGroupVideo resume error:", e);
      }
      store.setVideoMuted(false);
      broadcastGroupMediaState(store.audioMuted, false);
      return;
    }

    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24 } },
      });
      const videoTrack = videoStream.getVideoTracks()[0];
      if (!videoTrack) return;

      const audioTracks = localStream ? localStream.getAudioTracks() : [];
      localStream = new MediaStream([...audioTracks, videoTrack]);
      store.setLocalStream(localStream);
      store.setGroupCallType("VIDEO");
      store.setVideoMuted(false);

      if (sendTransport && device?.canProduce("video")) {
        if (existingProducer) {
          await existingProducer.replaceTrack({ track: videoTrack });
          try {
            existingProducer.resume();
          } catch {}
        } else {
          const roomId = activeRoomId || store.sfuRoomId;
          const videoProducer = await sendTransport.produce({
            track: videoTrack,
            appData: { peerId: getActiveUserId(), kind: "video" },
          });
          sfuProducers.set("video", videoProducer);
          if (roomId) notifyProducerReady(roomId, videoProducer.id, "video");
        }
      }
      broadcastGroupMediaState(store.audioMuted, false);
    } catch (err) {
      console.warn("[SFU] Failed to enable video in group call:", err);
      store.setVideoMuted(true);
    }
  } else {
    if (localStream) {
      localStream.getVideoTracks().forEach((t) => (t.enabled = false));
    }
    const videoProducer = sfuProducers.get("video");
    if (videoProducer) {
      try {
        videoProducer.pause();
      } catch (e) {
        console.warn("[SFU] toggleGroupVideo pause error:", e);
      }
    }
    store.setVideoMuted(true);
    broadcastGroupMediaState(store.audioMuted, true);
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
  const audioTracks = localStream ? localStream.getAudioTracks() : [];
  localStream = new MediaStream([...audioTracks, newTrack]);
  useCallStore.getState().setLocalStream(localStream);
}

export function handleSfuSignal(data: any) {
  const store = useCallStore.getState();
  if (!store.active || store.type !== "GROUP") return;
  const myId = getActiveUserId();

  switch (data.type) {
    case "sfu-peer-joined":
      if (data.sender_id && data.sender_id !== myId) {
        const profile = resolveMemberProfile(store.conversationId, data.sender_id);
        useCallStore.getState().addPeerStream({
          peerId: data.sender_id,
          userId: profile.userId,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl,
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
      useCallStore.getState().setSpeaking(data.active_peer_id === myId);
      break;
  }
}
