"use client";

import { useState } from "react";
import { MoreHorizontal, Ban, Flag, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReportDialog } from "@/components/moderation/ReportDialog";
import { BlockConfirmDialog } from "@/components/moderation/BlockConfirmDialog";
import { useBlock } from "@/hooks/use-block";

interface ProfileActionsProps {
  userId: string;
  userName: string;
}

export function ProfileActions({ userId, userName }: ProfileActionsProps) {
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);

  const { blockedByMe, isPending, blockUser, unblockUser } = useBlock(userId);

  const handleBlockConfirm = async () => {
    await blockUser();
  };

  const handleUnblock = async () => {
    await unblockUser();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">More actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {blockedByMe ? (
            <DropdownMenuItem
              onClick={handleUnblock}
              disabled={isPending}
              className="text-muted-foreground"
            >
              <UserX className="mr-2 h-4 w-4" />
              Unblock {userName}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() => setShowBlockDialog(true)}
              className="text-destructive focus:text-destructive"
            >
              <Ban className="mr-2 h-4 w-4" />
              Block {userName}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowReportDialog(true)}
            className="text-yellow-600 focus:text-yellow-600"
          >
            <Flag className="mr-2 h-4 w-4" />
            Report {userName}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ReportDialog
        userId={userId}
        userName={userName}
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
      />

      <BlockConfirmDialog
        userName={userName}
        open={showBlockDialog}
        onOpenChange={setShowBlockDialog}
        onConfirm={handleBlockConfirm}
        isPending={isPending}
      />
    </>
  );
}
