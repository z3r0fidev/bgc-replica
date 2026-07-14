import { describe, it, expect, vi, beforeEach } from "vitest";
import { useGroupChatStore } from "@/store/groupChatStore";
import { groupChatService } from "@/services/groupChatService";
import type {
  GroupChat,
  GroupChatDetail,
  GroupMessage,
  GroupMember,
} from "@/services/groupChatService";

vi.mock("@/services/groupChatService");

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

function makeGroup(overrides: Partial<GroupChat> = {}): GroupChat {
  return {
    id: "group-1",
    name: "Group One",
    description: null,
    avatar_url: null,
    owner_id: "owner-1",
    is_active: true,
    max_members: 50,
    member_count: 1,
    last_message_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeGroupDetail(overrides: Partial<GroupChatDetail> = {}): GroupChatDetail {
  return {
    ...makeGroup(),
    members: [],
    my_membership: null,
    ...overrides,
  };
}

function makeMessage(overrides: Partial<GroupMessage> = {}): GroupMessage {
  return {
    id: "msg-1",
    group_id: "group-1",
    sender_id: "user-1",
    content: "hello",
    message_type: "text",
    reply_to_id: null,
    is_edited: false,
    is_deleted: false,
    created_at: "2026-01-01T00:00:00Z",
    sender_name: "User One",
    sender_avatar: null,
    ...overrides,
  };
}

function makeMember(overrides: Partial<GroupMember> = {}): GroupMember {
  return {
    id: "member-1",
    group_id: "group-1",
    user_id: "user-2",
    role: "member",
    nickname: null,
    is_muted: false,
    last_read_at: null,
    joined_at: "2026-01-01T00:00:00Z",
    user_name: "User Two",
    user_avatar: null,
    ...overrides,
  };
}

describe("useGroupChatStore", () => {
  beforeEach(() => {
    // Merge (not replace) so the store's action functions stay intact —
    // replacing wholesale would wipe them since `initialState` only has data fields.
    useGroupChatStore.setState(initialState);
    vi.clearAllMocks();
  });

  describe("fetchGroups", () => {
    it("sets isLoadingGroups true then false, and replaces groups when offset is 0", async () => {
      const groups = [makeGroup({ id: "group-a" }), makeGroup({ id: "group-b" })];
      let sawLoadingTrue = false;
      vi.mocked(groupChatService.listMyGroups).mockImplementation(async () => {
        sawLoadingTrue = useGroupChatStore.getState().isLoadingGroups;
        return { groups, total: 2 };
      });

      await useGroupChatStore.getState().fetchGroups();

      expect(sawLoadingTrue).toBe(true);
      expect(groupChatService.listMyGroups).toHaveBeenCalledWith(20, 0);
      const state = useGroupChatStore.getState();
      expect(state.groups).toEqual(groups);
      expect(state.totalGroups).toBe(2);
      expect(state.isLoadingGroups).toBe(false);
    });

    it("appends to existing groups when offset is greater than 0", async () => {
      const existing = [makeGroup({ id: "group-a" })];
      useGroupChatStore.setState({ groups: existing, totalGroups: 1 });
      const nextPage = [makeGroup({ id: "group-b" })];
      vi.mocked(groupChatService.listMyGroups).mockResolvedValue({
        groups: nextPage,
        total: 2,
      });

      await useGroupChatStore.getState().fetchGroups(1);

      expect(groupChatService.listMyGroups).toHaveBeenCalledWith(20, 1);
      const state = useGroupChatStore.getState();
      expect(state.groups).toEqual([...existing, ...nextPage]);
      expect(state.totalGroups).toBe(2);
    });

    it("resets isLoadingGroups to false and rethrows on service error", async () => {
      const error = new Error("network down");
      vi.mocked(groupChatService.listMyGroups).mockRejectedValue(error);

      await expect(useGroupChatStore.getState().fetchGroups()).rejects.toThrow(
        "network down"
      );
      expect(useGroupChatStore.getState().isLoadingGroups).toBe(false);
    });
  });

  describe("fetchGroup", () => {
    it("sets currentGroup on success", async () => {
      const group = makeGroupDetail({ id: "group-1" });
      vi.mocked(groupChatService.getGroup).mockResolvedValue(group);

      await useGroupChatStore.getState().fetchGroup("group-1");

      expect(groupChatService.getGroup).toHaveBeenCalledWith("group-1");
      expect(useGroupChatStore.getState().currentGroup).toEqual(group);
    });

    it("propagates errors from the service", async () => {
      const error = new Error("not found");
      vi.mocked(groupChatService.getGroup).mockRejectedValue(error);

      await expect(useGroupChatStore.getState().fetchGroup("missing")).rejects.toThrow(
        "not found"
      );
      expect(useGroupChatStore.getState().currentGroup).toBeNull();
    });
  });

  describe("createGroup", () => {
    it("prepends the new group to groups, increments totalGroups, and returns it", async () => {
      const existing = [makeGroup({ id: "group-a" })];
      useGroupChatStore.setState({ groups: existing, totalGroups: 1 });
      const created = makeGroup({ id: "group-new", name: "New Group" });
      vi.mocked(groupChatService.createGroup).mockResolvedValue(created);

      const result = await useGroupChatStore
        .getState()
        .createGroup({ name: "New Group" });

      expect(result).toEqual(created);
      const state = useGroupChatStore.getState();
      expect(state.groups).toEqual([created, ...existing]);
      expect(state.totalGroups).toBe(2);
    });
  });

  describe("deleteGroup", () => {
    it("removes the group from the list and decrements totalGroups", async () => {
      const groups = [makeGroup({ id: "group-a" }), makeGroup({ id: "group-b" })];
      useGroupChatStore.setState({ groups, totalGroups: 2 });
      vi.mocked(groupChatService.deleteGroup).mockResolvedValue(undefined);

      await useGroupChatStore.getState().deleteGroup("group-a");

      const state = useGroupChatStore.getState();
      expect(state.groups.map(g => g.id)).toEqual(["group-b"]);
      expect(state.totalGroups).toBe(1);
    });

    it("clears currentGroup when it matches the deleted group", async () => {
      const groups = [makeGroup({ id: "group-a" })];
      useGroupChatStore.setState({
        groups,
        totalGroups: 1,
        currentGroup: makeGroupDetail({ id: "group-a" }),
      });
      vi.mocked(groupChatService.deleteGroup).mockResolvedValue(undefined);

      await useGroupChatStore.getState().deleteGroup("group-a");

      expect(useGroupChatStore.getState().currentGroup).toBeNull();
    });

    it("does NOT clear currentGroup when viewing a different group", async () => {
      const groups = [makeGroup({ id: "group-a" }), makeGroup({ id: "group-b" })];
      const viewedGroup = makeGroupDetail({ id: "group-b" });
      useGroupChatStore.setState({
        groups,
        totalGroups: 2,
        currentGroup: viewedGroup,
      });
      vi.mocked(groupChatService.deleteGroup).mockResolvedValue(undefined);

      await useGroupChatStore.getState().deleteGroup("group-a");

      expect(useGroupChatStore.getState().currentGroup).toEqual(viewedGroup);
    });
  });

  describe("fetchMessages", () => {
    it("sets isLoadingMessages true then false, and replaces messages when before is undefined", async () => {
      const messages = [makeMessage({ id: "msg-1" }), makeMessage({ id: "msg-2" })];
      let sawLoadingTrue = false;
      vi.mocked(groupChatService.getMessages).mockImplementation(async () => {
        sawLoadingTrue = useGroupChatStore.getState().isLoadingMessages;
        return { messages, total: 2, has_more: true };
      });

      await useGroupChatStore.getState().fetchMessages("group-1");

      expect(sawLoadingTrue).toBe(true);
      expect(groupChatService.getMessages).toHaveBeenCalledWith("group-1", 50, undefined);
      const state = useGroupChatStore.getState();
      expect(state.messages).toEqual(messages);
      expect(state.hasMoreMessages).toBe(true);
      expect(state.isLoadingMessages).toBe(false);
    });

    it("prepends older messages before existing ones when before is provided", async () => {
      const existing = [makeMessage({ id: "msg-new" })];
      useGroupChatStore.setState({ messages: existing });
      const olderPage = [makeMessage({ id: "msg-old-1" }), makeMessage({ id: "msg-old-2" })];
      vi.mocked(groupChatService.getMessages).mockResolvedValue({
        messages: olderPage,
        total: 3,
        has_more: false,
      });

      await useGroupChatStore.getState().fetchMessages("group-1", "cursor-1");

      expect(groupChatService.getMessages).toHaveBeenCalledWith("group-1", 50, "cursor-1");
      const state = useGroupChatStore.getState();
      expect(state.messages).toEqual([...olderPage, ...existing]);
      expect(state.hasMoreMessages).toBe(false);
    });

    it("resets isLoadingMessages to false and rethrows on service error", async () => {
      const error = new Error("boom");
      vi.mocked(groupChatService.getMessages).mockRejectedValue(error);

      await expect(
        useGroupChatStore.getState().fetchMessages("group-1")
      ).rejects.toThrow("boom");
      expect(useGroupChatStore.getState().isLoadingMessages).toBe(false);
    });
  });

  describe("sendMessage", () => {
    it("appends the sent message, toggles isSending, and updates the matching group's last_message_at", async () => {
      const groups = [
        makeGroup({ id: "group-1", last_message_at: null }),
        makeGroup({ id: "group-other", last_message_at: "2025-01-01T00:00:00Z" }),
      ];
      useGroupChatStore.setState({ groups, messages: [] });
      const sent = makeMessage({
        id: "msg-new",
        group_id: "group-1",
        created_at: "2026-02-02T00:00:00Z",
      });
      let sawSendingTrue = false;
      vi.mocked(groupChatService.sendMessage).mockImplementation(async () => {
        sawSendingTrue = useGroupChatStore.getState().isSending;
        return sent;
      });

      await useGroupChatStore.getState().sendMessage("group-1", { content: "hello" });

      expect(sawSendingTrue).toBe(true);
      const state = useGroupChatStore.getState();
      expect(state.isSending).toBe(false);
      expect(state.messages).toEqual([sent]);
      const updatedGroup = state.groups.find(g => g.id === "group-1");
      const untouchedGroup = state.groups.find(g => g.id === "group-other");
      expect(updatedGroup?.last_message_at).toBe("2026-02-02T00:00:00Z");
      expect(untouchedGroup?.last_message_at).toBe("2025-01-01T00:00:00Z");
    });

    it("resets isSending to false and rethrows on service error", async () => {
      const error = new Error("send failed");
      vi.mocked(groupChatService.sendMessage).mockRejectedValue(error);

      await expect(
        useGroupChatStore.getState().sendMessage("group-1", { content: "hi" })
      ).rejects.toThrow("send failed");
      expect(useGroupChatStore.getState().isSending).toBe(false);
    });
  });

  describe("deleteMessage", () => {
    it("soft-deletes the matching message and leaves others untouched", async () => {
      const messages = [
        makeMessage({ id: "msg-1", content: "keep me" }),
        makeMessage({ id: "msg-2", content: "delete me" }),
      ];
      useGroupChatStore.setState({ messages });
      vi.mocked(groupChatService.deleteMessage).mockResolvedValue(undefined);

      await useGroupChatStore.getState().deleteMessage("group-1", "msg-2");

      expect(groupChatService.deleteMessage).toHaveBeenCalledWith("group-1", "msg-2");
      const state = useGroupChatStore.getState();
      const untouched = state.messages.find(m => m.id === "msg-1");
      const deleted = state.messages.find(m => m.id === "msg-2");
      expect(untouched).toEqual(messages[0]);
      expect(deleted?.is_deleted).toBe(true);
      expect(deleted?.content).toBe("[Message deleted]");
    });
  });

  describe("addMember", () => {
    it("appends the member and increments member_count when viewing the target group", async () => {
      const currentGroup = makeGroupDetail({
        id: "group-1",
        members: [],
        member_count: 1,
      });
      useGroupChatStore.setState({ currentGroup });
      const member = makeMember({ id: "member-new", user_id: "user-3" });
      vi.mocked(groupChatService.addMember).mockResolvedValue(member);

      const result = await useGroupChatStore.getState().addMember("group-1", "user-3");

      expect(groupChatService.addMember).toHaveBeenCalledWith("group-1", {
        user_id: "user-3",
      });
      expect(result).toEqual(member);
      const state = useGroupChatStore.getState();
      expect(state.currentGroup?.members).toEqual([member]);
      expect(state.currentGroup?.member_count).toBe(2);
    });

    it("does not touch currentGroup when viewing a different group", async () => {
      const currentGroup = makeGroupDetail({
        id: "group-other",
        members: [],
        member_count: 1,
      });
      useGroupChatStore.setState({ currentGroup });
      const member = makeMember({ id: "member-new" });
      vi.mocked(groupChatService.addMember).mockResolvedValue(member);

      await useGroupChatStore.getState().addMember("group-1", "user-3");

      expect(useGroupChatStore.getState().currentGroup).toEqual(currentGroup);
    });

    it("does not touch currentGroup when there is no current group", async () => {
      useGroupChatStore.setState({ currentGroup: null });
      const member = makeMember({ id: "member-new" });
      vi.mocked(groupChatService.addMember).mockResolvedValue(member);

      await useGroupChatStore.getState().addMember("group-1", "user-3");

      expect(useGroupChatStore.getState().currentGroup).toBeNull();
    });
  });

  describe("removeMember", () => {
    it("removes the member and decrements member_count when viewing the target group", async () => {
      const member = makeMember({ id: "member-1", user_id: "user-2" });
      const currentGroup = makeGroupDetail({
        id: "group-1",
        members: [member],
        member_count: 2,
      });
      useGroupChatStore.setState({ currentGroup });
      vi.mocked(groupChatService.removeMember).mockResolvedValue(undefined);

      await useGroupChatStore.getState().removeMember("group-1", "user-2");

      expect(groupChatService.removeMember).toHaveBeenCalledWith("group-1", "user-2");
      const state = useGroupChatStore.getState();
      expect(state.currentGroup?.members).toEqual([]);
      expect(state.currentGroup?.member_count).toBe(1);
    });

    it("does not touch currentGroup when viewing a different group", async () => {
      const member = makeMember({ id: "member-1", user_id: "user-2" });
      const currentGroup = makeGroupDetail({
        id: "group-other",
        members: [member],
        member_count: 2,
      });
      useGroupChatStore.setState({ currentGroup });
      vi.mocked(groupChatService.removeMember).mockResolvedValue(undefined);

      await useGroupChatStore.getState().removeMember("group-1", "user-2");

      expect(useGroupChatStore.getState().currentGroup).toEqual(currentGroup);
    });

    it("does not touch currentGroup when there is no current group", async () => {
      useGroupChatStore.setState({ currentGroup: null });
      vi.mocked(groupChatService.removeMember).mockResolvedValue(undefined);

      await useGroupChatStore.getState().removeMember("group-1", "user-2");

      expect(useGroupChatStore.getState().currentGroup).toBeNull();
    });
  });

  describe("addMessage (real-time)", () => {
    it("appends the message to messages when it belongs to the current group", () => {
      useGroupChatStore.setState({
        currentGroup: makeGroupDetail({ id: "group-1" }),
        messages: [],
      });
      const message = makeMessage({ id: "msg-rt", group_id: "group-1" });

      useGroupChatStore.getState().addMessage(message);

      expect(useGroupChatStore.getState().messages).toEqual([message]);
    });

    it("does NOT append the message when it belongs to a different group than currentGroup", () => {
      useGroupChatStore.setState({
        currentGroup: makeGroupDetail({ id: "group-1" }),
        messages: [],
      });
      const message = makeMessage({ id: "msg-rt", group_id: "group-other" });

      useGroupChatStore.getState().addMessage(message);

      expect(useGroupChatStore.getState().messages).toEqual([]);
    });

    it("always updates last_message_at in the groups list regardless of currentGroup", () => {
      const groups = [
        makeGroup({ id: "group-1", last_message_at: null }),
        makeGroup({ id: "group-other", last_message_at: "2025-01-01T00:00:00Z" }),
      ];
      // Viewing a totally different group (or none) shouldn't prevent the groups
      // list's last_message_at from being refreshed for the incoming message's group.
      useGroupChatStore.setState({ groups, currentGroup: null, messages: [] });
      const message = makeMessage({
        id: "msg-rt",
        group_id: "group-1",
        created_at: "2026-03-03T00:00:00Z",
      });

      useGroupChatStore.getState().addMessage(message);

      const state = useGroupChatStore.getState();
      expect(state.messages).toEqual([]);
      const updated = state.groups.find(g => g.id === "group-1");
      const untouched = state.groups.find(g => g.id === "group-other");
      expect(updated?.last_message_at).toBe("2026-03-03T00:00:00Z");
      expect(untouched?.last_message_at).toBe("2025-01-01T00:00:00Z");
    });
  });

  describe("updateMessage", () => {
    it("replaces the matching message and leaves others untouched", () => {
      const messages = [
        makeMessage({ id: "msg-1", content: "original" }),
        makeMessage({ id: "msg-2", content: "unchanged" }),
      ];
      useGroupChatStore.setState({ messages });
      const updated = makeMessage({ id: "msg-1", content: "edited", is_edited: true });

      useGroupChatStore.getState().updateMessage(updated);

      const state = useGroupChatStore.getState();
      expect(state.messages.find(m => m.id === "msg-1")).toEqual(updated);
      expect(state.messages.find(m => m.id === "msg-2")).toEqual(messages[1]);
    });
  });

  describe("removeMessage", () => {
    it("soft-deletes the matching message locally without calling the service", () => {
      const messages = [
        makeMessage({ id: "msg-1", content: "keep" }),
        makeMessage({ id: "msg-2", content: "gone" }),
      ];
      useGroupChatStore.setState({ messages });

      useGroupChatStore.getState().removeMessage("msg-2");

      expect(groupChatService.deleteMessage).not.toHaveBeenCalled();
      const state = useGroupChatStore.getState();
      expect(state.messages.find(m => m.id === "msg-1")).toEqual(messages[0]);
      const removed = state.messages.find(m => m.id === "msg-2");
      expect(removed?.is_deleted).toBe(true);
      expect(removed?.content).toBe("[Message deleted]");
    });
  });

  describe("clearCurrentGroup", () => {
    it("resets currentGroup, messages, and hasMoreMessages", () => {
      useGroupChatStore.setState({
        currentGroup: makeGroupDetail({ id: "group-1" }),
        messages: [makeMessage()],
        hasMoreMessages: true,
        groups: [makeGroup()],
        totalGroups: 1,
      });

      useGroupChatStore.getState().clearCurrentGroup();

      const state = useGroupChatStore.getState();
      expect(state.currentGroup).toBeNull();
      expect(state.messages).toEqual([]);
      expect(state.hasMoreMessages).toBe(false);
      // Unrelated state should be untouched by this targeted reset.
      expect(state.groups).toHaveLength(1);
      expect(state.totalGroups).toBe(1);
    });
  });

  describe("reset", () => {
    it("resets the whole store back to initialState", () => {
      useGroupChatStore.setState({
        groups: [makeGroup()],
        currentGroup: makeGroupDetail(),
        messages: [makeMessage()],
        isLoadingGroups: true,
        isLoadingMessages: true,
        isSending: true,
        totalGroups: 5,
        hasMoreMessages: true,
      });

      useGroupChatStore.getState().reset();

      const state = useGroupChatStore.getState();
      expect(state.groups).toEqual(initialState.groups);
      expect(state.currentGroup).toEqual(initialState.currentGroup);
      expect(state.messages).toEqual(initialState.messages);
      expect(state.isLoadingGroups).toBe(initialState.isLoadingGroups);
      expect(state.isLoadingMessages).toBe(initialState.isLoadingMessages);
      expect(state.isSending).toBe(initialState.isSending);
      expect(state.totalGroups).toBe(initialState.totalGroups);
      expect(state.hasMoreMessages).toBe(initialState.hasMoreMessages);
    });
  });
});
