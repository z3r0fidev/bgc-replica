/**
 * Group Chat Store
 * Manages group chat state with Zustand
 */

import { create } from 'zustand';
import {
  groupChatService,
  GroupChat,
  GroupChatDetail,
  GroupMessage,
  GroupMember,
  CreateGroupRequest,
  SendMessageRequest,
} from '@/services/groupChatService';

interface GroupChatState {
  // Data
  groups: GroupChat[];
  currentGroup: GroupChatDetail | null;
  messages: GroupMessage[];

  // Loading states
  isLoadingGroups: boolean;
  isLoadingMessages: boolean;
  isSending: boolean;

  // Pagination
  totalGroups: number;
  hasMoreMessages: boolean;

  // Actions
  fetchGroups: (offset?: number) => Promise<void>;
  fetchGroup: (groupId: string) => Promise<void>;
  createGroup: (data: CreateGroupRequest) => Promise<GroupChat>;
  deleteGroup: (groupId: string) => Promise<void>;

  fetchMessages: (groupId: string, before?: string) => Promise<void>;
  sendMessage: (groupId: string, data: SendMessageRequest) => Promise<void>;
  deleteMessage: (groupId: string, messageId: string) => Promise<void>;

  addMember: (groupId: string, userId: string) => Promise<GroupMember>;
  removeMember: (groupId: string, userId: string) => Promise<void>;

  // Real-time updates
  addMessage: (message: GroupMessage) => void;
  updateMessage: (message: GroupMessage) => void;
  removeMessage: (messageId: string) => void;

  // Reset
  clearCurrentGroup: () => void;
  reset: () => void;
}

const initialState = {
  groups: [],
  currentGroup: null,
  messages: [],
  isLoadingGroups: false,
  isLoadingMessages: false,
  isSending: false,
  totalGroups: 0,
  hasMoreMessages: false,
};

export const useGroupChatStore = create<GroupChatState>((set, get) => ({
  ...initialState,

  fetchGroups: async (offset = 0) => {
    set({ isLoadingGroups: true });
    try {
      const result = await groupChatService.listMyGroups(20, offset);
      set(state => ({
        groups: offset === 0 ? result.groups : [...state.groups, ...result.groups],
        totalGroups: result.total,
        isLoadingGroups: false,
      }));
    } catch (error) {
      set({ isLoadingGroups: false });
      throw error;
    }
  },

  fetchGroup: async (groupId: string) => {
    try {
      const group = await groupChatService.getGroup(groupId);
      set({ currentGroup: group });
    } catch (error) {
      throw error;
    }
  },

  createGroup: async (data: CreateGroupRequest) => {
    const group = await groupChatService.createGroup(data);
    set(state => ({
      groups: [group, ...state.groups],
      totalGroups: state.totalGroups + 1,
    }));
    return group;
  },

  deleteGroup: async (groupId: string) => {
    await groupChatService.deleteGroup(groupId);
    set(state => ({
      groups: state.groups.filter(g => g.id !== groupId),
      totalGroups: state.totalGroups - 1,
      currentGroup: state.currentGroup?.id === groupId ? null : state.currentGroup,
    }));
  },

  fetchMessages: async (groupId: string, before?: string) => {
    set({ isLoadingMessages: true });
    try {
      const result = await groupChatService.getMessages(groupId, 50, before);
      set(state => ({
        messages: before
          ? [...result.messages, ...state.messages]
          : result.messages,
        hasMoreMessages: result.has_more,
        isLoadingMessages: false,
      }));
    } catch (error) {
      set({ isLoadingMessages: false });
      throw error;
    }
  },

  sendMessage: async (groupId: string, data: SendMessageRequest) => {
    set({ isSending: true });
    try {
      const message = await groupChatService.sendMessage(groupId, data);
      set(state => ({
        messages: [...state.messages, message],
        isSending: false,
      }));

      // Update group's last_message_at in the list
      set(state => ({
        groups: state.groups.map(g =>
          g.id === groupId
            ? { ...g, last_message_at: message.created_at }
            : g
        ),
      }));
    } catch (error) {
      set({ isSending: false });
      throw error;
    }
  },

  deleteMessage: async (groupId: string, messageId: string) => {
    await groupChatService.deleteMessage(groupId, messageId);
    set(state => ({
      messages: state.messages.map(m =>
        m.id === messageId
          ? { ...m, is_deleted: true, content: '[Message deleted]' }
          : m
      ),
    }));
  },

  addMember: async (groupId: string, userId: string) => {
    const member = await groupChatService.addMember(groupId, { user_id: userId });

    // Update current group if viewing
    const { currentGroup } = get();
    if (currentGroup?.id === groupId) {
      set({
        currentGroup: {
          ...currentGroup,
          members: [...currentGroup.members, member],
          member_count: currentGroup.member_count + 1,
        },
      });
    }

    return member;
  },

  removeMember: async (groupId: string, userId: string) => {
    await groupChatService.removeMember(groupId, userId);

    // Update current group if viewing
    const { currentGroup } = get();
    if (currentGroup?.id === groupId) {
      set({
        currentGroup: {
          ...currentGroup,
          members: currentGroup.members.filter(m => m.user_id !== userId),
          member_count: currentGroup.member_count - 1,
        },
      });
    }
  },

  // Real-time message handlers
  addMessage: (message: GroupMessage) => {
    const { currentGroup } = get();
    if (currentGroup?.id === message.group_id) {
      set(state => ({
        messages: [...state.messages, message],
      }));
    }

    // Update last_message_at in groups list
    set(state => ({
      groups: state.groups.map(g =>
        g.id === message.group_id
          ? { ...g, last_message_at: message.created_at }
          : g
      ),
    }));
  },

  updateMessage: (message: GroupMessage) => {
    set(state => ({
      messages: state.messages.map(m =>
        m.id === message.id ? message : m
      ),
    }));
  },

  removeMessage: (messageId: string) => {
    set(state => ({
      messages: state.messages.map(m =>
        m.id === messageId
          ? { ...m, is_deleted: true, content: '[Message deleted]' }
          : m
      ),
    }));
  },

  clearCurrentGroup: () => {
    set({ currentGroup: null, messages: [], hasMoreMessages: false });
  },

  reset: () => {
    set(initialState);
  },
}));
