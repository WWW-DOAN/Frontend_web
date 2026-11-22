import http from "../api/http";
import { API } from "../api/path";

export interface IceServer {
  urls: string;
  username?: string;
  credential?: string;
}

export interface StartCallResponse {
  id: string;
  conversationId: string;
  startedBy: string;
  type: "AUDIO" | "VIDEO";
  status: "ONGOING" | "ENDED";
  startedAt: string;
  participants: { userId: string; joinedAt: string }[];
}

export const callService = {
  async getIceServers(): Promise<{ iceServers: IceServer[] }> {
    const res = await http.get<{ iceServers: IceServer[] }>(API.API_ICE_SERVERS);
    return res.payload;
  },

  async startCall(conversationId: string, type: "AUDIO" | "VIDEO"): Promise<StartCallResponse> {
    const res = await http.post<StartCallResponse>(API.API_CALLS_START(conversationId), { type });
    return res.payload;
  },

  async getCallHistory(conversationId: string, page = 1, limit = 20) {
    const res = await http.get(`${API.API_CALLS_HISTORY(conversationId)}?page=${page}&limit=${limit}`);
    return res.payload;
  },

  async getCallState(conversationId: string) {
    const res = await http.get(API.API_CALLS_STATE(conversationId));
    return res.payload;
  },

  async joinCall(conversationId: string, callId: string) {
    const res = await http.post(API.API_CALLS_JOIN(conversationId, callId), {});
    return res.payload;
  },

  async endCall(conversationId: string, callId: string, reason?: string) {
    const res = await http.post(API.API_CALLS_END(conversationId, callId), { reason });
    return res.payload;
  },

  async rejectCall(conversationId: string, callId: string) {
    const res = await http.post(API.API_CALLS_REJECT(conversationId, callId), {});
    return res.payload;
  },
};
