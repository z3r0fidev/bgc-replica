"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Ban } from "lucide-react";

interface BlockConfirmDialogProps {
  userName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending?: boolean;
}

export function BlockConfirmDialog({
  userName,
  open,
  onOpenChange,
  onConfirm,
  isPending = false,
}: BlockConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5 text-destructive" />
            Block {userName}?
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 pt-2">
              <p>When you block someone:</p>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>They won&apos;t be able to message you</li>
                <li>They won&apos;t see your profile</li>
                <li>They won&apos;t appear in your search results</li>
                <li>You won&apos;t see their posts in your feed</li>
              </ul>
              <p className="text-sm text-muted-foreground">
                You can unblock them anytime from your settings.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            disabled={isPending}
          >
            {isPending ? "Blocking..." : "Block User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
