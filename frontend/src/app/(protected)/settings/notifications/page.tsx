"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bell,
  Mail,
  MessageSquare,
  Users,
  Eye,
  Star,
  MessageCircle,
  AtSign,
  Megaphone,
  Newspaper,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { notificationService } from "@/services/notificationService";
import { NotificationPreferences } from "@/types/notification";

interface NotificationSetting {
  key: keyof NotificationPreferences;
  label: string;
  description: string;
  icon: React.ReactNode;
  category: "communication" | "activity" | "marketing";
}

const emailSettings: NotificationSetting[] = [
  {
    key: "email_messages",
    label: "Direct Messages",
    description: "Receive emails when you get new messages",
    icon: <MessageSquare className="h-4 w-4" />,
    category: "communication",
  },
  {
    key: "email_friend_requests",
    label: "Friend Requests",
    description: "Receive emails for new friend requests",
    icon: <Users className="h-4 w-4" />,
    category: "communication",
  },
  {
    key: "email_profile_views",
    label: "Profile Views",
    description: "Get notified when someone views your profile",
    icon: <Eye className="h-4 w-4" />,
    category: "activity",
  },
  {
    key: "email_ratings",
    label: "Profile Ratings",
    description: "Receive emails when you get rated",
    icon: <Star className="h-4 w-4" />,
    category: "activity",
  },
  {
    key: "email_forum_replies",
    label: "Forum Replies",
    description: "Get notified when someone replies to your forum posts",
    icon: <MessageCircle className="h-4 w-4" />,
    category: "communication",
  },
  {
    key: "email_mentions",
    label: "Mentions",
    description: "Receive emails when you're mentioned",
    icon: <AtSign className="h-4 w-4" />,
    category: "communication",
  },
  {
    key: "email_promotions",
    label: "Promotions",
    description: "Receive promotional offers and deals",
    icon: <Megaphone className="h-4 w-4" />,
    category: "marketing",
  },
  {
    key: "email_newsletter",
    label: "Newsletter",
    description: "Receive our weekly newsletter with updates",
    icon: <Newspaper className="h-4 w-4" />,
    category: "marketing",
  },
];

export default function NotificationSettingsPage() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [, setPendingChanges] = useState<Partial<NotificationPreferences>>({});

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const data = await notificationService.getPreferences();
      setPreferences(data.preferences);
    } catch {
      toast.error("Failed to load notification preferences");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!preferences) return;

    // Optimistic update
    setPreferences({ ...preferences, [key]: value });
    setPendingChanges((prev) => ({ ...prev, [key]: value }));

    try {
      await notificationService.updatePreferences({ [key]: value });
      toast.success("Preference updated");
    } catch {
      // Revert on error
      setPreferences({ ...preferences });
      toast.error("Failed to update preference");
    }
  };

  const handleDigestChange = async (value: string) => {
    if (!preferences) return;

    const frequency = value as NotificationPreferences["email_digest_frequency"];
    setPreferences({ ...preferences, email_digest_frequency: frequency });

    try {
      await notificationService.updatePreferences({ email_digest_frequency: frequency });
      toast.success("Digest frequency updated");
    } catch {
      toast.error("Failed to update digest frequency");
    }
  };

  const handleToggleAllEmail = async (enabled: boolean) => {
    setIsSaving(true);
    try {
      const data = await notificationService.toggleAllEmail(enabled);
      setPreferences(data.preferences);
      toast.success(data.message);
    } catch {
      toast.error("Failed to toggle email notifications");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    setIsSaving(true);
    try {
      const data = await notificationService.resetPreferences();
      setPreferences(data.preferences);
      toast.success("Preferences reset to defaults");
    } catch {
      toast.error("Failed to reset preferences");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container max-w-2xl py-10 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="container max-w-2xl py-10">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Failed to load preferences</p>
          <Button onClick={fetchPreferences} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  const communicationSettings = emailSettings.filter((s) => s.category === "communication");
  const activitySettings = emailSettings.filter((s) => s.category === "activity");
  const marketingSettings = emailSettings.filter((s) => s.category === "marketing");

  return (
    <div className="container max-w-2xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bell className="h-8 w-8" />
            Notifications
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage how you receive notifications
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
          <CardDescription>Manage all email notifications at once</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button
            variant="outline"
            onClick={() => handleToggleAllEmail(true)}
            disabled={isSaving}
          >
            Enable All Emails
          </Button>
          <Button
            variant="outline"
            onClick={() => handleToggleAllEmail(false)}
            disabled={isSaving}
          >
            Disable All Emails
          </Button>
          <Button
            variant="ghost"
            onClick={handleReset}
            disabled={isSaving}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
        </CardContent>
      </Card>

      {/* Email Digest Frequency */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Digest
          </CardTitle>
          <CardDescription>
            Choose how often you want to receive email notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="digest-frequency">Delivery Frequency</Label>
            <Select
              value={preferences.email_digest_frequency}
              onValueChange={handleDigestChange}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="instant">Instant</SelectItem>
                <SelectItem value="daily">Daily Digest</SelectItem>
                <SelectItem value="weekly">Weekly Digest</SelectItem>
                <SelectItem value="never">Never</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {preferences.email_digest_frequency === "instant"
              ? "You'll receive emails as events happen"
              : preferences.email_digest_frequency === "daily"
              ? "You'll receive a daily summary of notifications"
              : preferences.email_digest_frequency === "weekly"
              ? "You'll receive a weekly summary of notifications"
              : "You won't receive any email notifications"}
          </p>
        </CardContent>
      </Card>

      {/* Communication Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Communication</CardTitle>
          <CardDescription>
            Notifications for messages and social interactions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {communicationSettings.map((setting) => (
            <div
              key={setting.key}
              className="flex items-center justify-between py-2"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  {setting.icon}
                </div>
                <div>
                  <Label htmlFor={setting.key} className="font-medium">
                    {setting.label}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {setting.description}
                  </p>
                </div>
              </div>
              <Switch
                id={setting.key}
                checked={preferences[setting.key] as boolean}
                onCheckedChange={(checked) => handleToggle(setting.key, checked)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Activity Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Activity</CardTitle>
          <CardDescription>
            Notifications about activity on your profile
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {activitySettings.map((setting) => (
            <div
              key={setting.key}
              className="flex items-center justify-between py-2"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  {setting.icon}
                </div>
                <div>
                  <Label htmlFor={setting.key} className="font-medium">
                    {setting.label}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {setting.description}
                  </p>
                </div>
              </div>
              <Switch
                id={setting.key}
                checked={preferences[setting.key] as boolean}
                onCheckedChange={(checked) => handleToggle(setting.key, checked)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Marketing Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Marketing</CardTitle>
          <CardDescription>
            Promotional emails and newsletters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {marketingSettings.map((setting) => (
            <div
              key={setting.key}
              className="flex items-center justify-between py-2"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  {setting.icon}
                </div>
                <div>
                  <Label htmlFor={setting.key} className="font-medium">
                    {setting.label}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {setting.description}
                  </p>
                </div>
              </div>
              <Switch
                id={setting.key}
                checked={preferences[setting.key] as boolean}
                onCheckedChange={(checked) => handleToggle(setting.key, checked)}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
