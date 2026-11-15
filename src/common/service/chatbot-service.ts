import http from "../api/http";
import { API } from "../api/path";
import type { IApiResponse } from "../interface/auth-interface";
import type {
  ChatbotConversation,
  ChatbotMessage,
  ChatbotSendMessageResponse,
} from "../interface/chatbot-interface";

export const chatbotService = {
  listConversations() {
    return http.get<IApiResponse<ChatbotConversation[]>>(
      API.API_CHATBOT_CONVERSATIONS
    );
  },

  createConversation(title?: string) {
    return http.post<IApiResponse<ChatbotConversation>>(
      API.API_CHATBOT_CONVERSATIONS,
      { title }
    );
  },

  getConversation(conversationId: string) {
    return http.get<IApiResponse<ChatbotConversation>>(
      API.API_CHATBOT_CONVERSATION(conversationId)
    );
  },

  deleteConversation(conversationId: string) {
    return http.delete<IApiResponse<{ deleted: boolean }>>(
      API.API_CHATBOT_CONVERSATION(conversationId)
    );
  },

  listMessages(conversationId: string) {
    return http.get<IApiResponse<ChatbotMessage[]>>(
      API.API_CHATBOT_MESSAGES(conversationId)
    );
  },

  sendMessage(conversationId: string, content: string) {
    return http.post<IApiResponse<ChatbotSendMessageResponse>>(
      API.API_CHATBOT_MESSAGES(conversationId),
      { content }
    );
  },

  groupAssistant(payload: {
    prompt: string;
    conversationId?: string;
    senderName?: string;
    recentMessages?: { senderName?: string; content?: string; createdAt?: string }[];
  }) {
    return http.post<IApiResponse<{ success: boolean; reply: string; actionType: string; actionPayload?: string }>>(
      API.API_CHATBOT_GROUP_ASSISTANT,
      payload
    );
  },

  visionQa(payload: {
    imageUrl?: string;
    imageBase64?: string;
    mimeType?: string;
    prompt?: string;
  }) {
    return http.post<IApiResponse<{ success: boolean; answer: string; actionType: string }>>(
      API.API_CHATBOT_VISION_QA,
      payload
    );
  },

  smartReplies(payload: {
    recentMessages: { senderName: string; content: string; isOwn?: boolean }[];
    language?: string;
  }) {
    return http.post<IApiResponse<{ success: boolean; suggestions: string[] }>>(
      API.API_CHATBOT_SMART_REPLIES,
      payload
    );
  },

  translate(payload: { text: string; targetLanguage?: string }) {
    return http.post<IApiResponse<{
      success: boolean;
      originalText: string;
      translatedText: string;
      detectedLanguage: string;
      targetLanguage: string;
    }>>(API.API_CHATBOT_TRANSLATE, payload);
  },
};
