/**
 * Gallery Types
 * Spec 010 - Media Gallery & Albums
 */

export type MediaType = "IMAGE" | "VIDEO";
export type PrivacyLevel = "PUBLIC" | "FRIENDS_ONLY" | "PRIVATE";

export interface GalleryMedia {
  id: string;
  user_id: string;
  type: MediaType;
  url: string;
  thumbnail_url?: string;
  filename?: string;
  mime_type?: string;
  width?: number;
  height?: number;
  size_bytes?: number;
  duration_seconds?: number;
  privacy: PrivacyLevel;
  view_count: number;
  created_at: string;
}

export interface GalleryMediaWithPosition extends GalleryMedia {
  position: number;
}

export interface GalleryPage {
  items: GalleryMedia[];
  next_cursor?: string;
  total_count: number;
}

export interface Album {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  cover_media_id?: string;
  cover_url?: string;
  privacy: PrivacyLevel;
  media_count: number;
  created_at: string;
}

export interface AlbumWithMedia extends Album {
  media: GalleryMediaWithPosition[];
}

export interface AlbumPage {
  items: Album[];
  next_cursor?: string;
}

export interface UploadProgress {
  id: string;
  filename: string;
  progress: number;
  status: "pending" | "uploading" | "processing" | "complete" | "error";
  error?: string;
  result?: GalleryMedia;
}

export interface ShareLink {
  share_url: string;
  share_token: string;
  expires_at: string;
}
