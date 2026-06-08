"use client";

import { UseFormReturn, FieldValues } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PrivacyToggle } from "../PrivacyToggle";
import { PrivacyLevel, PrivacySettings } from "@/types/profile";
import { Instagram, Twitter, Globe, Video } from "lucide-react";

interface SocialLinksTabProps {
  form: UseFormReturn<FieldValues>;
  privacySettings: PrivacySettings;
  onPrivacyChange: (field: string, level: PrivacyLevel) => void;
}

export function SocialLinksTab({
  form,
  privacySettings,
  onPrivacyChange,
}: SocialLinksTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4 p-3 bg-muted/50 rounded-lg">
        <div>
          <h3 className="text-sm font-medium">Social Link Visibility</h3>
          <p className="text-xs text-muted-foreground">
            This controls who can see all your social links
          </p>
        </div>
        <PrivacyToggle
          field="social_links"
          value={privacySettings.social_links || "PUBLIC"}
          onChange={onPrivacyChange}
        />
      </div>

      <FormField
        control={form.control}
        name="social_links.instagram_url"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-2">
              <Instagram className="h-4 w-4" />
              Instagram
            </FormLabel>
            <FormControl>
              <Input
                placeholder="https://instagram.com/username"
                {...field}
                value={field.value || ""}
              />
            </FormControl>
            <FormDescription>Full URL to your Instagram profile</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="social_links.x_url"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-2">
              <Twitter className="h-4 w-4" />
              X (Twitter)
            </FormLabel>
            <FormControl>
              <Input
                placeholder="https://x.com/username"
                {...field}
                value={field.value || ""}
              />
            </FormControl>
            <FormDescription>Full URL to your X profile</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="social_links.tiktok_url"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              TikTok
            </FormLabel>
            <FormControl>
              <Input
                placeholder="https://tiktok.com/@username"
                {...field}
                value={field.value || ""}
              />
            </FormControl>
            <FormDescription>Full URL to your TikTok profile</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="social_links.website_url"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Personal Website
            </FormLabel>
            <FormControl>
              <Input
                placeholder="https://yoursite.com"
                {...field}
                value={field.value || ""}
              />
            </FormControl>
            <FormDescription>Your personal website or portfolio</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
