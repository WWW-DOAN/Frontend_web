import { toast } from "react-toastify";

function notifyDeveloping() {
  toast.info("Tính năng gọi nhóm đang phát triển.");
}

export function initCallUser() {}

export async function startGroupCall(_conversationId: string, _callType: "AUDIO" | "VIDEO" = "AUDIO") {
  notifyDeveloping();
}

export async function handleIncomingGroupCall(
  _conversationId: string,
  _sessionId: string,
  _sfuRoomId: string,
  _callType: "AUDIO" | "VIDEO" = "AUDIO"
) {
  notifyDeveloping();
}

export async function endGroupCall(_conversationId?: string, _sessionId?: string) {}

export function toggleGroupAudio(_enabled: boolean) {}

export async function toggleGroupVideo(_enabled: boolean) {}

export async function replaceGroupVideoTrack(_newTrack: MediaStreamTrack) {}

export function handleSfuSignal(_data: any) {}
