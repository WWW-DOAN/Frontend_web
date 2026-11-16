import { useCallStore } from "../store/useCallStore";
import { callService, IceServer } from "../service/call-service";
import { sendSocketMessage, subscribeToConversation } from "../socket/socket";
import { getcurrentUserId } from "../utilities/utils";
import { playRingtone, playBusyTone, stopRingtone } from "../service/ringtone";

let peerConnection: RTCPeerConnection | null = null;
let localStream: MediaStream | null = null;
let iceServers: IceServer[] = [];
let currentUserId: string | null = null;
let pendingOffer: { sdp: RTCSessionDescriptionInit; senderId: string } | null = null;
let pendingIceCandidates: RTCIceCandidateInit[] = [];
let localIceCandidatesBuffer: RTCIceCandidateInit[] = [];
let ringingTimeoutId: ReturnType<typeof setTimeout> | null = null;

function getActiveUserId(): string | null {
  return currentUserId || getcurrentUserId();
}

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
  return iceServers.map((s) => ({
    urls: s.urls,
    username: s.username,
    credential: s.credential,
  }));
}

function getRTCConfig(): RTCConfiguration {
  return {
    iceServers: iceServers.map((s) => ({
      urls: s.urls,
      username: s.username,
      credential: s.credential,
    })),
    iceCandidatePoolSize: 10,
  };
}

function getVideoConstraints(video: boolean): MediaStreamConstraints["video"] {
  if (!video) return false;
  return {
    facingMode: "user",
    width: { ideal: 360, max: 720 },
    height: { ideal: 480, max: 1280 },
    frameRate: { ideal: 24, max: 30 },
  };
}

async function getLocalStream(video: boolean): Promise<MediaStream> {
  if (localStream) return localStream;
  localStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: getVideoConstraints(video),
  });
  return localStream;
}

export async function enableVideo(): Promise<void> {
  try {
    const videoStream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: getVideoConstraints(true),
    });
    const videoTrack = videoStream.getVideoTracks()[0];
    if (!videoTrack) return;

    const audioTracks = localStream ? localStream.getAudioTracks() : [];
    const updatedStream = new MediaStream([...audioTracks, videoTrack]);
    localStream = updatedStream;

    const pc = peerConnection;
    const store = useCallStore.getState();

    if (pc) {
      const videoSender = pc.getSenders().find((s) => s.track?.kind === "video" || (!s.track && s.dtmf === null));
      if (videoSender) {
        await videoSender.replaceTrack(videoTrack);
      } else {
        pc.addTrack(videoTrack, updatedStream);
      }
    }

    store.setLocalStream(updatedStream);
    store.setType("VIDEO");
    store.setVideoMuted(false);

    if (pc && store.conversationId) {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSocketMessage("/app/call.offer", {
          conversation_id: store.conversationId,
          sdp: pc.localDescription,
          renegotiate: true,
        });
        sendSocketMessage("/app/call.media-state", {
          conversation_id: store.conversationId,
          audio_muted: store.audioMuted,
          video_muted: false,
        });
      } catch (err) {
        console.warn("[Call] enableVideo renegotiation failed:", err);
      }
    }
  } catch (err) {
    console.warn("[Call] enableVideo failed:", err);
  }
}

export async function replaceVideoTrack1vs1(newTrack: MediaStreamTrack): Promise<void> {
  const pc = peerConnection;
  if (pc) {
    const videoSender = pc.getSenders().find((s) => s.track?.kind === "video");
    if (videoSender) {
      await videoSender.replaceTrack(newTrack);
    }
  }
  const audioTracks = localStream ? localStream.getAudioTracks() : [];
  const updatedStream = new MediaStream([...audioTracks, newTrack]);
  localStream = updatedStream;
  useCallStore.getState().setLocalStream(updatedStream);
}

export function notifyMediaState1vs1(audioMuted: boolean, videoMuted: boolean): void {
  const store = useCallStore.getState();
  if (!store.conversationId) return;
  sendSocketMessage("/app/call.media-state", {
    conversation_id: store.conversationId,
    audio_muted: audioMuted,
    video_muted: videoMuted,
  });
}

let originalCameraTrack: MediaStreamTrack | null = null;
let screenStream: MediaStream | null = null;

export async function toggleScreenShare(): Promise<void> {
  const store = useCallStore.getState();
  const pc = peerConnection;
  if (!pc) return;

  if (store.isScreenSharing) {
    if (screenStream) {
      screenStream.getTracks().forEach((t) => t.stop());
      screenStream = null;
    }
    const videoSender = pc.getSenders().find((s) => s.track?.kind === "video");
    if (videoSender && originalCameraTrack) {
      void videoSender.replaceTrack(originalCameraTrack);
      if (localStream) {
        const oldTrack = localStream.getVideoTracks()[0];
        if (oldTrack) localStream.removeTrack(oldTrack);
        localStream.addTrack(originalCameraTrack);
        store.setLocalStream(localStream);
      }
    }
    store.setScreenSharing(false);
  } else {
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      const screenTrack = displayStream.getVideoTracks()[0];
      if (!screenTrack) return;

      screenStream = displayStream;

      const videoSender = pc.getSenders().find((s) => s.track?.kind === "video");
      if (videoSender) {
        if (videoSender.track) {
          originalCameraTrack = videoSender.track;
        }
        void videoSender.replaceTrack(screenTrack);
      } else {
        pc.addTrack(screenTrack, displayStream);
      }

      if (localStream) {
        const oldTrack = localStream.getVideoTracks()[0];
        if (oldTrack && oldTrack !== screenTrack) {
          localStream.removeTrack(oldTrack);
        }
        localStream.addTrack(screenTrack);
        store.setLocalStream(localStream);
      }

      store.setScreenSharing(true);

      screenTrack.onended = () => {
        void toggleScreenShare();
      };
    } catch (err) {
      console.warn("[Call] getDisplayMedia cancelled or error:", err);
    }
  }
}

export function cleanupLocalStream() {
  if (screenStream) {
    screenStream.getTracks().forEach((t) => t.stop());
    screenStream = null;
  }
  originalCameraTrack = null;
  if (localStream) {
    localStream.getTracks().forEach((t) => t.stop());
    localStream = null;
  }
}

export function cleanupPeerConnection() {
  localIceCandidatesBuffer = [];
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
}

function clearPendingOffer() {
  pendingOffer = null;
}

function clearPendingIceCandidates() {
  pendingIceCandidates = [];
}

function setupRingingTimeout(conversationId: string) {
  clearRingingTimeout();
  ringingTimeoutId = setTimeout(() => {
    const store = useCallStore.getState();
    if (store.status === "ringing" || store.status === "connecting") {
      endCall(conversationId);
    }
    ringingTimeoutId = null;
  }, 30000);
}

function clearRingingTimeout() {
  if (ringingTimeoutId) {
    clearTimeout(ringingTimeoutId);
    ringingTimeoutId = null;
  }
}

function setupIceStateHandler(pc: RTCPeerConnection) {
  pc.oniceconnectionstatechange = () => {
    const state = pc.iceConnectionState;
    const callStore = useCallStore.getState();
    if (state === "connected" || state === "completed") {
      clearRingingTimeout();
      if (callStore.status === "connecting" || callStore.status === "reconnecting" || callStore.status === "ringing") {
        callStore.setConnected(localStream!);
      }
    } else if (state === "disconnected") {
      if (callStore.status === "connected") {
        callStore.setReconnecting();
      }
    } else if (state === "failed") {
      endCall();
    }
  };
}

export async function startCall(conversationId: string, type: "AUDIO" | "VIDEO") {
  const store = useCallStore.getState();
  if (store.active) return;

  useCallStore.getState().setStarting(true);
  try {
    localIceCandidatesBuffer = [];
    const callResult = await callService.startCall(conversationId, type);
    useCallStore.getState().initiateCall({
      callId: callResult.id,
      conversationId,
      type,
    });
    subscribeToConversation(conversationId);
    setupRingingTimeout(conversationId);

    await loadIceServers();
    useCallStore.getState().setConnecting();
    const stream = await getLocalStream(type === "VIDEO");
    useCallStore.getState().setLocalStream(stream);

    peerConnection = new RTCPeerConnection(getRTCConfig());
    stream.getTracks().forEach((track) => peerConnection!.addTrack(track, stream));
    setupIceStateHandler(peerConnection);

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        const candidateJson = event.candidate.toJSON();
        localIceCandidatesBuffer.push(candidateJson);
        sendSocketMessage("/app/call.ice-candidate", {
          conversation_id: conversationId,
          candidate: candidateJson,
        });
      }
    };

    peerConnection.ontrack = (event) => {
      const incomingStream = event.streams[0];
      if (incomingStream) {
        useCallStore.getState().setRemoteStream(new MediaStream(incomingStream.getTracks()));
      } else if (event.track) {
        const existing = useCallStore.getState().remoteStream;
        const tracks = existing ? [...existing.getTracks().filter((t) => t.id !== event.track.id), event.track] : [event.track];
        useCallStore.getState().setRemoteStream(new MediaStream(tracks));
      }
    };

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    sendSocketMessage("/app/call.offer", {
      conversation_id: conversationId,
      sdp: peerConnection.localDescription,
    });
  } catch (err: any) {
    useCallStore.getState().setError(err.message || "Failed to start call");
    endCall(conversationId);
  } finally {
    useCallStore.getState().setStarting(false);
  }
}

export async function answerCall(conversationId: string, callId: string) {
  const store = useCallStore.getState();

  useCallStore.getState().setAnswering(true);
  try {
    subscribeToConversation(conversationId);
    try {
      await callService.joinCall(conversationId, callId);
    } catch (err) {
      console.warn('[Call] joinCall failed (non-fatal):', err);
    }
    useCallStore.getState().setConnecting();

    await loadIceServers();
    const stream = await getLocalStream(store.type === "VIDEO");
    useCallStore.getState().setLocalStream(stream);

    peerConnection = new RTCPeerConnection(getRTCConfig());
    stream.getTracks().forEach((track) => peerConnection!.addTrack(track, stream));
    setupIceStateHandler(peerConnection);

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        sendSocketMessage("/app/call.ice-candidate", {
          conversation_id: conversationId,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    peerConnection.ontrack = (event) => {
      const incomingStream = event.streams[0];
      if (incomingStream) {
        useCallStore.getState().setRemoteStream(new MediaStream(incomingStream.getTracks()));
      } else if (event.track) {
        const existing = useCallStore.getState().remoteStream;
        const tracks = existing ? [...existing.getTracks().filter((t) => t.id !== event.track.id), event.track] : [event.track];
        useCallStore.getState().setRemoteStream(new MediaStream(tracks));
      }
    };

    if (!pendingOffer) {
      sendSocketMessage("/app/call.ready", { conversation_id: conversationId });
    }

    const answerParams: { sdp: RTCSessionDescriptionInit; candidates: RTCIceCandidateInit[] } | null = pendingOffer
      ? { sdp: pendingOffer.sdp, candidates: pendingIceCandidates }
      : await new Promise<{ sdp: RTCSessionDescriptionInit; candidates: RTCIceCandidateInit[] } | null>((resolve) => {
          let ticks = 0;
          const check = setInterval(() => {
            ticks += 1;
            if (pendingOffer) {
              clearInterval(check);
              clearTimeout(timer);
              resolve({ sdp: pendingOffer.sdp, candidates: pendingIceCandidates });
            } else if (ticks % 10 === 0) {
              sendSocketMessage("/app/call.ready", { conversation_id: conversationId });
            }
          }, 100);
          const timer = setTimeout(() => {
            clearInterval(check);
            resolve(null);
          }, 5000);
        });

    if (answerParams) {
      const offer = new RTCSessionDescription(answerParams.sdp);
      await peerConnection.setRemoteDescription(offer);
      for (const candidate of answerParams.candidates) {
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch {}
      }
      pendingIceCandidates = [];
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      sendSocketMessage("/app/call.answer", {
        conversation_id: conversationId,
        sdp: peerConnection.localDescription,
      });
      pendingOffer = null;
    } else {
      throw new Error("Không nhận được tín hiệu kết nối từ người gọi");
    }
  } catch (err: any) {
    useCallStore.getState().setError(err.message || "Failed to answer call");
    endCall(conversationId);
  } finally {
    useCallStore.getState().setAnswering(false);
  }
}

export async function rejectCall(conversationId: string, callId: string) {
  useCallStore.getState().setRejecting(true);
  try {
    await callService.rejectCall(conversationId, callId);
    sendSocketMessage("/app/call.hangup", {
      conversation_id: conversationId,
    });
  } catch (err) {
    console.warn('[Call] rejectCall failed:', err);
  } finally {
    clearPendingOffer();
    clearPendingIceCandidates();
    clearRingingTimeout();
    stopRingtone();
    useCallStore.getState().setRejecting(false);
    useCallStore.getState().resetCall();
  }
}

function getLastCallInfo(): { callId: string | null; convId: string | null } {
  try {
    const callId = localStorage.getItem('lastCallId');
    const convId = localStorage.getItem('lastConvId');
    return { callId, convId };
  } catch {
    return { callId: null, convId: null };
  }
}

function clearLastCallInfo() {
  try {
    localStorage.removeItem('lastCallId');
    localStorage.removeItem('lastConvId');
  } catch {}
}

export async function endCall(conversationId?: string) {
  const store = useCallStore.getState();
  const convId = conversationId || store.conversationId;
  let callId = store.callId;

  useCallStore.getState().setEnding(true);

  if (!callId) {
    const last = getLastCallInfo();
    callId = last.callId ?? null;
  }

  if (callId && convId) {
    try {
      await callService.endCall(convId, callId);
    } catch {
      console.warn('[Call] HTTP endCall failed — call may stay ONGOING in DB');
    }
  }

  if (convId) {
    sendSocketMessage("/app/call.hangup", {
      conversation_id: convId,
    });
  }

  clearPendingOffer();
  clearPendingIceCandidates();
  clearRingingTimeout();
  stopRingtone();
  const wasConnected = useCallStore.getState().status === "connected";
  cleanupPeerConnection();
  cleanupLocalStream();
  useCallStore.getState().setEnded();
  if (wasConnected) {
    playBusyTone();
  }
  if (callId && convId) {
    localStorage.setItem('lastCallId', callId);
    localStorage.setItem('lastConvId', convId);
  }
  useCallStore.getState().setEnding(false);
  setTimeout(() => {
    clearLastCallInfo();
    useCallStore.getState().resetCall();
  }, 1000);
}

export function handleCallSignal(data: any) {
  const store = useCallStore.getState();
  const peer = peerConnection;
  const myId = getActiveUserId();

  if (myId && data.sender_id === myId) return;

  if (!store.active) {
    if (data.type === "offer") {
      pendingOffer = { sdp: data.sdp, senderId: data.sender_id };
    } else if (data.type === "ice-candidate" && data.candidate) {
      pendingIceCandidates.push(data.candidate);
    }
    return;
  }

  switch (data.type) {
    case "ready": {
      if (peer && peer.localDescription && peer.localDescription.type === "offer" && store.conversationId) {
        sendSocketMessage("/app/call.offer", {
          conversation_id: store.conversationId,
          sdp: peer.localDescription,
        });
        for (const candidate of localIceCandidatesBuffer) {
          sendSocketMessage("/app/call.ice-candidate", {
            conversation_id: store.conversationId,
            candidate,
          });
        }
      }
      break;
    }
    case "media-state": {
      useCallStore.getState().setRemoteMediaState({
        audioMuted: Boolean(data.audio_muted),
        videoMuted: Boolean(data.video_muted),
      });
      break;
    }
    case "offer": {
      if (!peer) {
        pendingOffer = { sdp: data.sdp, senderId: data.sender_id };
        return;
      }
      if (peer.signalingState !== "stable") {
        return;
      }
      const sdpStr = typeof data.sdp?.sdp === "string" ? data.sdp.sdp : "";
      if (sdpStr.includes("m=video") && useCallStore.getState().type === "AUDIO") {
        useCallStore.getState().setType("VIDEO");
        useCallStore.getState().setRemoteMediaState({ videoMuted: false });
      }
      const offer = new RTCSessionDescription(data.sdp);
      peer.setRemoteDescription(offer).then(async () => {
        for (const candidate of pendingIceCandidates) {
          try {
            await peer.addIceCandidate(new RTCIceCandidate(candidate));
          } catch {}
        }
        pendingIceCandidates = [];
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        sendSocketMessage("/app/call.answer", {
          conversation_id: store.conversationId,
          sdp: peer.localDescription,
        });
      }).catch((err) => {
        console.warn('[Call] Failed to process offer:', err);
      });
      break;
    }
    case "answer": {
      if (!peer) return;
      const answer = new RTCSessionDescription(data.sdp);
      peer.setRemoteDescription(answer).catch((err) => {
        console.warn('[Call] Failed to process answer:', err);
      });
      break;
    }
    case "ice-candidate": {
      if (!data.candidate) return;
      if (!peer) {
        pendingIceCandidates.push(data.candidate);
        return;
      }
      const candidate = new RTCIceCandidate(data.candidate);
      peer.addIceCandidate(candidate).catch(() => {});
      break;
    }
    case "hangup": {
      clearPendingOffer();
      clearPendingIceCandidates();
      clearRingingTimeout();
      stopRingtone();
      const wasConnected = useCallStore.getState().status === "connected";
      cleanupPeerConnection();
      cleanupLocalStream();
      useCallStore.getState().setEnded();
      if (wasConnected) {
        playBusyTone();
      }
      setTimeout(() => useCallStore.getState().resetCall(), 1000);
      break;
    }
  }
}
