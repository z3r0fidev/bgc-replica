// Profile Types for BGC Replica

export interface User {
  id: string;
  name?: string;
  email?: string;
  image?: string;
}

export interface SocialLinks {
  instagram_url?: string;
  x_url?: string;
  tiktok_url?: string;
  website_url?: string;
}

export type PrivacyLevel = "PUBLIC" | "FRIENDS_ONLY" | "PRIVATE";

export type PrivacySettings = {
  [key: string]: PrivacyLevel | undefined;
};

export interface Profile {
  id: string;
  bio?: string;
  height?: string;
  weight?: number;
  ethnicity?: string;
  body_type?: string;
  roles?: string[];
  interests?: string[];
  location_city?: string;
  location_state?: string;
  location_lat?: number;
  location_lng?: number;
  privacy_level?: string;
  position?: string;
  build?: string;
  hiv_status?: string;
  privacy_mode?: string;
  is_trans_interested?: boolean;

  // Social Expansion Fields
  display_name?: string;
  pronouns?: string;
  birthdate?: string; // ISO date string
  age?: number; // Computed field from backend
  gender_identity?: string;
  relationship_status?: string;
  looking_for?: string[];
  occupation?: string;
  industry?: string;
  education_level?: string;
  university?: string;
  social_links?: SocialLinks;
  privacy_settings?: PrivacySettings;

  last_active?: string;
  user?: User;
}

// Dropdown Options
export const PRONOUNS_OPTIONS = [
  "He/Him",
  "She/Her",
  "They/Them",
  "He/They",
  "She/They",
  "Any Pronouns",
  "Other",
] as const;

export const GENDER_IDENTITY_OPTIONS = [
  "Cis-male",
  "Cis-female",
  "Trans-male",
  "Trans-female",
  "Non-binary",
  "Genderqueer",
  "Genderfluid",
  "Agender",
  "Other",
] as const;

export const RELATIONSHIP_STATUS_OPTIONS = [
  "Single",
  "In a Relationship",
  "Married",
  "Open Relationship",
  "Its Complicated",
  "Prefer Not to Say",
] as const;

export const LOOKING_FOR_OPTIONS = [
  "Friendship",
  "Networking",
  "Dating",
  "Activity Partners",
  "Long-term Relationship",
  "Casual",
  "Not Sure Yet",
] as const;

export const INDUSTRY_OPTIONS = [
  "Technology",
  "Healthcare",
  "Finance",
  "Education",
  "Entertainment",
  "Arts & Design",
  "Legal",
  "Marketing",
  "Hospitality",
  "Real Estate",
  "Nonprofit",
  "Government",
  "Retail",
  "Manufacturing",
  "Other",
] as const;

export const EDUCATION_LEVEL_OPTIONS = [
  "High School",
  "Some College",
  "Associates Degree",
  "Bachelors Degree",
  "Masters Degree",
  "Doctorate",
  "Trade School",
  "Other",
] as const;

// Profile Completion Types

export interface CompletionTip {
  field: string;
  label: string;
  category: "critical" | "important" | "nice_to_have";
  tab: "basics" | "identity" | "lifestyle" | "professional" | "social";
  weight: number;
  quick_win: boolean;
}

export interface MilestoneStatus {
  level: number;
  name: string;
  threshold: number;
  reached: boolean;
  badge_icon: "seedling" | "compass" | "star" | "trophy";
}

export interface FeatureUnlock {
  threshold: number;
  name: string;
  description: string;
  unlocked: boolean;
}

export interface ProfileCompletion {
  percentage: number;
  raw_percentage: number;
  critical_filled: number;
  critical_total: number;
  important_filled: number;
  important_total: number;
  nice_to_have_filled: number;
  nice_to_have_total: number;
  suggestions: CompletionTip[];
  milestones: MilestoneStatus[];
  current_milestone: string;
  next_milestone?: string;
  status_label: string;
  feature_unlocks: FeatureUnlock[];
}
