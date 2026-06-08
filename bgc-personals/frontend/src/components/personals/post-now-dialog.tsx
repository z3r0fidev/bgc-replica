"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MediaUploadZone } from "./media-upload";
import { RichEditor } from "./editor/RichEditor";
import { toast } from "sonner";
import { Loader2, PlusCircle } from "lucide-react";

const CATEGORIES = [
  { label: "TransX", value: "transx" },
  { label: "MILFY", value: "milfy" },
  { label: "BGC Originals", value: "bgc-originals" },
  { label: "Gay", value: "gay" },
  { label: "Queer", value: "queer" },
];

export function PostNowDialog() {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [category, setCategory] = useState("");
  const [content, setContent] = useState("");
  const [mediaIds, setMediaIds] = useState<string[]>([]);

  const handleSubmit = async () => {
    if (!category) {
      toast.error("Please select a category");
      return;
    }
    if (!content || content === "<p></p>") {
      toast.error("Please enter some content");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/personals/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category,
          content,
          media_ids: mediaIds,
        }),
      });

      if (!response.ok) throw new Error("Failed to create post");

      toast.success("Post created successfully!");
      setOpen(false);
      // Reset form
      setCategory("");
      setContent("");
      setMediaIds([]);
    } catch (error) {
      toast.error("Failed to create post. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold rounded-full px-6 shadow-lg shadow-purple-500/20">
          <PlusCircle className="w-5 h-5" />
          Post Now
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-purple-600">
            Create New Personal Ad
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Content</Label>
            <RichEditor 
              content={content} 
              onChange={setContent} 
              placeholder="What's on your mind?" 
            />
          </div>

          <div className="space-y-2">
            <Label>Media (Optional)</Label>
            <MediaUploadZone onUploadComplete={setMediaIds} maxFiles={4} />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white min-w-[100px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Posting...
              </>
            ) : (
              "Post Now"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
