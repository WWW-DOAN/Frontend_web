import { chatService } from "./chat-service";

export const groupService = {
  createGroupConversation(name: string, memberIds: string[], avatarUrl?: string | null) {
    return chatService.createGroupConversation({
      name,
      memberIds,
      avatarUrl: avatarUrl ?? undefined,
    });
  },

  addMembersToGroup(conversationId: string, memberIds: string[]) {
    return chatService.addMembers(conversationId, { memberIds });
  },

  removeMemberFromGroup(conversationId: string, memberId: string) {
    return chatService.removeMember(conversationId, memberId);
  },

  leaveGroup(conversationId: string) {
    return chatService.leaveConversation(conversationId);
  },

  updateMemberRole(conversationId: string, memberId: string, role: "ADMIN" | "MEMBER") {
    return chatService.updateMemberRole(conversationId, memberId, role);
  },

  disbandGroup(conversationId: string) {
    return chatService.disbandGroup(conversationId);
  },

  updateConversation(conversationId: string, name?: string, avatarUrl?: string | null) {
    if (avatarUrl === null) {
      throw new Error("The group API does not support clearing the avatar.");
    }

    return chatService.updateConversation(conversationId, {
      ...(name !== undefined ? { name } : {}),
      ...(avatarUrl !== undefined ? { avatarUrl } : {}),
    });
  },

  updateMySettings(conversationId: string, nickname?: string) {
    return chatService.updateConversationSettings(conversationId, { nickname });
  },
};
