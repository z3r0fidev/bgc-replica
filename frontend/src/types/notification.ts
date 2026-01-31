export interface NotificationPreferences {
  // Email notifications
  email_messages: boolean;
  email_friend_requests: boolean;
  email_profile_views: boolean;
  email_ratings: boolean;
  email_forum_replies: boolean;
  email_mentions: boolean;
  email_promotions: boolean;
  email_newsletter: boolean;

  // Email digest frequency
  email_digest_frequency: "instant" | "daily" | "weekly" | "never";

  // Push notifications (for future use)
  push_messages: boolean;
  push_friend_requests: boolean;
  push_profile_views: boolean;
  push_ratings: boolean;
  push_forum_replies: boolean;
  push_mentions: boolean;
}

export interface NotificationPreferencesUpdate {
  email_messages?: boolean;
  email_friend_requests?: boolean;
  email_profile_views?: boolean;
  email_ratings?: boolean;
  email_forum_replies?: boolean;
  email_mentions?: boolean;
  email_promotions?: boolean;
  email_newsletter?: boolean;
  email_digest_frequency?: "instant" | "daily" | "weekly" | "never";
  push_messages?: boolean;
  push_friend_requests?: boolean;
  push_profile_views?: boolean;
  push_ratings?: boolean;
  push_forum_replies?: boolean;
  push_mentions?: boolean;
}

export interface NotificationPreferencesResponse {
  preferences: NotificationPreferences;
  message: string;
}
