/**
 * Group Chat Service
 * Handles API calls for group chat functionality
 */

export interface GroupChat {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  owner_id: string;
  is_active: boolean;
  max_members: number;
  member_count: number;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  nickname: string | null;
  is_muted: boolean;
  last_read_at: string | null;
  joined_at: string;
  user_name: string | null;
  user_avatar: string | null;
}

export interface GroupMessage {
  id: string;
  group_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'system';
  reply_to_id: string | null;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  sender_name: string | null;
  sender_avatar: string | null;
}

export interface GroupChatDetail extends GroupChat {
  members: GroupMember[];
  my_membership: GroupMember | null;
}

export interface GroupChatList {
  groups: GroupChat[];
  total: number;
}

export interface GroupMessageList {
  messages: GroupMessage[];
  total: number;
  has_more: boolean;
}

export interface CreateGroupRequest {
  name: string;
  description?: string;
  avatar_url?: string;
  max_members?: number;
}

export interface UpdateGroupRequest {
  name?: string;
  description?: string;
  avatar_url?: string;
  max_members?: number;
  settings?: Record<string, unknown>;
}

export interface AddMemberRequest {
  user_id: string;
}

export interface UpdateMemberRequest {
  role?: 'admin' | 'member';
  nickname?: string;
  is_muted?: boolean;
}

export interface SendMessageRequest {
  content: string;
  message_type?: 'text' | 'image' | 'system';
  reply_to_id?: string;
}

export interface EditMessageRequest {
  content: string;
}

const API_BASE = '/api/group-chats';

class GroupChatService {
  private async fetch<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  // ============ Group CRUD ============

  async createGroup(data: CreateGroupRequest): Promise<GroupChat> {
    return this.fetch<GroupChat>(API_BASE, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async listMyGroups(limit = 20, offset = 0): Promise<GroupChatList> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });
    return this.fetch<GroupChatList>(`${API_BASE}?${params}`);
  }

  async getGroup(groupId: string): Promise<GroupChatDetail> {
    return this.fetch<GroupChatDetail>(`${API_BASE}/${groupId}`);
  }

  async updateGroup(groupId: string, data: UpdateGroupRequest): Promise<GroupChat> {
    return this.fetch<GroupChat>(`${API_BASE}/${groupId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteGroup(groupId: string): Promise<void> {
    return this.fetch<void>(`${API_BASE}/${groupId}`, {
      method: 'DELETE',
    });
  }

  // ============ Member Management ============

  async addMember(groupId: string, data: AddMemberRequest): Promise<GroupMember> {
    return this.fetch<GroupMember>(`${API_BASE}/${groupId}/members`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateMember(
    groupId: string,
    userId: string,
    data: UpdateMemberRequest
  ): Promise<GroupMember> {
    return this.fetch<GroupMember>(`${API_BASE}/${groupId}/members/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async removeMember(groupId: string, userId: string): Promise<void> {
    return this.fetch<void>(`${API_BASE}/${groupId}/members/${userId}`, {
      method: 'DELETE',
    });
  }

  async leaveGroup(groupId: string, myUserId: string): Promise<void> {
    return this.removeMember(groupId, myUserId);
  }

  // ============ Messages ============

  async sendMessage(groupId: string, data: SendMessageRequest): Promise<GroupMessage> {
    return this.fetch<GroupMessage>(`${API_BASE}/${groupId}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMessages(
    groupId: string,
    limit = 50,
    before?: string
  ): Promise<GroupMessageList> {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (before) {
      params.set('before', before);
    }
    return this.fetch<GroupMessageList>(`${API_BASE}/${groupId}/messages?${params}`);
  }

  async editMessage(
    groupId: string,
    messageId: string,
    data: EditMessageRequest
  ): Promise<GroupMessage> {
    return this.fetch<GroupMessage>(`${API_BASE}/${groupId}/messages/${messageId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteMessage(groupId: string, messageId: string): Promise<void> {
    return this.fetch<void>(`${API_BASE}/${groupId}/messages/${messageId}`, {
      method: 'DELETE',
    });
  }
}

export const groupChatService = new GroupChatService();
