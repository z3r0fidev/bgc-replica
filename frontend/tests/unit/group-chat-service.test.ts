import { describe, it, expect, vi, afterEach } from "vitest";
import { groupChatService } from "@/services/groupChatService";

function mockFetchOnce(body: unknown, ok = true, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function mockFetchOnceNoContent(status = 204) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status,
    json: async () => {
      throw new SyntaxError("Unexpected end of JSON input");
    },
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function mockFetchOnceJsonThrows(ok = false, status = 500) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => {
      throw new SyntaxError("Unexpected token");
    },
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("groupChatService", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("shared response handling", () => {
    it("returns undefined for a 204 No Content response without parsing JSON", async () => {
      mockFetchOnceNoContent();

      const result = await groupChatService.removeMember("group-1", "user-1");

      expect(result).toBeUndefined();
    });

    it("falls back to a generic message when the error body isn't JSON", async () => {
      mockFetchOnceJsonThrows(false, 502);

      await expect(groupChatService.getGroup("group-1")).rejects.toThrow(
        "Unknown error"
      );
    });

    it("throws the server-provided detail message when the error body is JSON", async () => {
      mockFetchOnce({ detail: "Group not found" }, false, 404);

      await expect(groupChatService.getGroup("group-1")).rejects.toThrow(
        "Group not found"
      );
    });
  });

  describe("createGroup", () => {
    it("posts to the base endpoint with Content-Type set", async () => {
      const body = { id: "group-1", name: "My Group" };
      const fetchMock = mockFetchOnce(body);
      const data = { name: "My Group" };

      const result = await groupChatService.createGroup(data);

      expect(fetchMock).toHaveBeenCalledWith("/api/group-chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      expect(result).toEqual(body);
    });
  });

  describe("listMyGroups", () => {
    it("defaults limit and offset", async () => {
      const fetchMock = mockFetchOnce({ groups: [], total: 0 });

      await groupChatService.listMyGroups();

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain("limit=20");
      expect(calledUrl).toContain("offset=0");
    });

    it("accepts custom limit and offset", async () => {
      const fetchMock = mockFetchOnce({ groups: [], total: 0 });

      await groupChatService.listMyGroups(5, 10);

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain("limit=5");
      expect(calledUrl).toContain("offset=10");
    });
  });

  describe("updateGroup", () => {
    it("sends a PATCH with the update body", async () => {
      const fetchMock = mockFetchOnce({ id: "group-1" });
      const data = { name: "Renamed" };

      await groupChatService.updateGroup("group-1", data);

      expect(fetchMock).toHaveBeenCalledWith("/api/group-chats/group-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    });
  });

  describe("deleteGroup", () => {
    it("sends a DELETE request", async () => {
      const fetchMock = mockFetchOnceNoContent();

      await groupChatService.deleteGroup("group-1");

      expect(fetchMock).toHaveBeenCalledWith("/api/group-chats/group-1", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
    });
  });

  describe("addMember", () => {
    it("posts the member request body", async () => {
      const fetchMock = mockFetchOnce({ id: "member-1" });
      const data = { user_id: "user-2" };

      await groupChatService.addMember("group-1", data);

      expect(fetchMock).toHaveBeenCalledWith("/api/group-chats/group-1/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    });
  });

  describe("updateMember", () => {
    it("sends a PATCH to the member's URL", async () => {
      const fetchMock = mockFetchOnce({ id: "member-1" });
      const data = { role: "admin" as const };

      await groupChatService.updateMember("group-1", "user-2", data);

      expect(fetchMock).toHaveBeenCalledWith(
        "/api/group-chats/group-1/members/user-2",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );
    });
  });

  describe("removeMember / leaveGroup", () => {
    it("removeMember sends a DELETE to the member's URL", async () => {
      const fetchMock = mockFetchOnceNoContent();

      await groupChatService.removeMember("group-1", "user-2");

      expect(fetchMock).toHaveBeenCalledWith(
        "/api/group-chats/group-1/members/user-2",
        { method: "DELETE", headers: { "Content-Type": "application/json" } }
      );
    });

    it("leaveGroup delegates to removeMember with the caller's own id", async () => {
      const fetchMock = mockFetchOnceNoContent();

      await groupChatService.leaveGroup("group-1", "my-user-id");

      expect(fetchMock).toHaveBeenCalledWith(
        "/api/group-chats/group-1/members/my-user-id",
        { method: "DELETE", headers: { "Content-Type": "application/json" } }
      );
    });
  });

  describe("sendMessage", () => {
    it("posts the message request body", async () => {
      const fetchMock = mockFetchOnce({ id: "msg-1" });
      const data = { content: "hello" };

      await groupChatService.sendMessage("group-1", data);

      expect(fetchMock).toHaveBeenCalledWith(
        "/api/group-chats/group-1/messages",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );
    });
  });

  describe("getMessages", () => {
    it("defaults limit to 50 with no before cursor", async () => {
      const fetchMock = mockFetchOnce({ messages: [], total: 0, has_more: false });

      await groupChatService.getMessages("group-1");

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain("/api/group-chats/group-1/messages?");
      expect(calledUrl).toContain("limit=50");
      expect(calledUrl).not.toContain("before=");
    });

    it("includes the before cursor when provided", async () => {
      const fetchMock = mockFetchOnce({ messages: [], total: 0, has_more: false });

      await groupChatService.getMessages("group-1", 20, "2026-01-01T00:00:00Z");

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain("limit=20");
      expect(calledUrl).toContain("before=2026-01-01T00%3A00%3A00Z");
    });
  });

  describe("editMessage", () => {
    it("sends a PATCH to the message's URL", async () => {
      const fetchMock = mockFetchOnce({ id: "msg-1" });
      const data = { content: "edited" };

      await groupChatService.editMessage("group-1", "msg-1", data);

      expect(fetchMock).toHaveBeenCalledWith(
        "/api/group-chats/group-1/messages/msg-1",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );
    });
  });

  describe("deleteMessage", () => {
    it("sends a DELETE to the message's URL", async () => {
      const fetchMock = mockFetchOnceNoContent();

      await groupChatService.deleteMessage("group-1", "msg-1");

      expect(fetchMock).toHaveBeenCalledWith(
        "/api/group-chats/group-1/messages/msg-1",
        { method: "DELETE", headers: { "Content-Type": "application/json" } }
      );
    });
  });
});
