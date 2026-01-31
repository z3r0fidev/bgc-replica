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

  display_name?: string;
  pronouns?: string;
  birthdate?: string;
  age?: number;
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
