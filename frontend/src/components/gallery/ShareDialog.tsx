"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Copy, Check, Link as LinkIcon, Calendar } from "lucide-react";
import { toast } from "sonner";

interface ShareDialogProps {
  albumId: string;
  albumTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

interface ShareLink {
  share_url: string;
  share_token: string;
  expires_at: string;
}

export function ShareDialog({
  albumId,
  albumTitle,
  isOpen,
  onClose,
}: ShareDialogProps) {
  const [expiresInDays, setExpiresInDays] = useState("7");
  const [shareLink, setShareLink] = useState<ShareLink | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerateLink = async () => {
    setIsGenerating(true);
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(`/api/gallery/albums/${albumId}/share`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ expires_in_days: parseInt(expiresInDays) }),
      });

      if (!response.ok) throw new Error("Failed to generate share link");

      const data: ShareLink = await response.json();
      setShareLink(data);
    } catch (error) {
      toast.error("Failed to generate share link");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareLink) return;

    const fullUrl = `${window.location.origin}${shareLink.share_url}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  const handleClose = () => {
    setShareLink(null);
    setCopied(false);
    onClose();
  };

  const fullShareUrl = shareLink
    ? `${typeof window !== "undefined" ? window.location.origin : ""}${shareLink.share_url}`
    : "";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Share Album</DialogTitle>
          <DialogDescription>
            Generate a shareable link for "{albumTitle}"
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {!shareLink ? (
            <>
              <div className="grid gap-2">
                <Label htmlFor="expires">Link expires in</Label>
                <Select value={expiresInDays} onValueChange={setExpiresInDays}>
                  <SelectTrigger id="expires">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 day</SelectItem>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Anyone with this link can view the album until it expires
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <LinkIcon className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Share link generated</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Expires {new Date(shareLink.expires_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="share-link">Share URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="share-link"
                    value={fullShareUrl}
                    readOnly
                    className="text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleCopyLink}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            {shareLink ? "Done" : "Cancel"}
          </Button>
          {!shareLink && (
            <Button onClick={handleGenerateLink} disabled={isGenerating}>
              {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate Link
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
