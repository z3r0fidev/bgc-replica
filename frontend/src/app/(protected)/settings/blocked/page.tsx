"use client";

import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { blockService } from "@/services/blockService";
import { BlockedUser } from "@/types/block";
import { Ban, UserX } from "lucide-react";

export default function BlockedUsersPage() {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  useEffect(() => {
    fetchBlockedUsers();
  }, []);

  async function fetchBlockedUsers() {
    try {
      setIsLoading(true);
      const users = await blockService.getBlockedUsers();
      setBlockedUsers(users);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load blocked users"
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUnblock(userId: string) {
    setUnblockingId(userId);
    try {
      await blockService.unblockUser(userId);
      setBlockedUsers((prev) => prev.filter((u) => u.user.id !== userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unblock user");
    } finally {
      setUnblockingId(null);
    }
  }

  function getInitials(name: string | null): string {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  return (
    <div className="container max-w-2xl py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Ban className="h-6 w-6" />
          Blocked Users
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage users you&apos;ve blocked. Blocked users can&apos;t message you
          or see your profile.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-md">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-9 w-24" />
              </div>
            </Card>
          ))}
        </div>
      ) : blockedUsers.length === 0 ? (
        <Card className="p-8 text-center">
          <UserX className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-medium">No blocked users</h2>
          <p className="text-muted-foreground mt-1">
            You haven&apos;t blocked anyone yet.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {blockedUsers.map((blocked) => (
            <Card key={blocked.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage
                      src={blocked.user.image || undefined}
                      alt={blocked.user.name || "User"}
                    />
                    <AvatarFallback>
                      {getInitials(blocked.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {blocked.user.name || "Unknown User"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Blocked on {formatDate(blocked.blocked_at)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleUnblock(blocked.user.id)}
                  disabled={unblockingId === blocked.user.id}
                >
                  {unblockingId === blocked.user.id ? "Unblocking..." : "Unblock"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
