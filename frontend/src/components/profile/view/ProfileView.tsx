"use client";

import { Profile } from "@/types/profile";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  MapPin,
  Briefcase,
  GraduationCap,
  Heart,
  Link as LinkIcon,
  Instagram,
  Globe,
} from "lucide-react";
import Link from "next/link";
import { ProfileActions } from "@/components/profile/ProfileActions";

interface ProfileViewProps {
  profile: Profile;
  isOwner?: boolean;
}

export function ProfileView({ profile, isOwner = false }: ProfileViewProps) {
  const displayName = profile.display_name || profile.user?.name || "User";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={profile.user?.image} alt={displayName} />
              <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <h1 className="text-2xl font-bold">{displayName}</h1>
                {profile.pronouns && (
                  <span className="text-muted-foreground">
                    ({profile.pronouns})
                  </span>
                )}
              </div>
              {profile.age && (
                <p className="text-muted-foreground">{profile.age} years old</p>
              )}
              {profile.gender_identity && (
                <Badge variant="secondary" className="mt-2">
                  {profile.gender_identity}
                </Badge>
              )}
              {(profile.location_city || profile.location_state) && (
                <div className="flex items-center justify-center sm:justify-start gap-1 mt-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {[profile.location_city, profile.location_state]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isOwner ? (
                <Link
                  href="/profile/edit"
                  className="text-sm text-primary hover:underline"
                >
                  Edit Profile
                </Link>
              ) : (
                <ProfileActions
                  userId={profile.id}
                  userName={displayName}
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bio Section */}
      {profile.bio && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold">About</h2>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {profile.bio}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Lifestyle Section */}
      {(profile.relationship_status || profile.looking_for?.length) && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Lifestyle
            </h2>
          </CardHeader>
          <CardContent className="space-y-4">
            {profile.relationship_status && (
              <div>
                <span className="text-sm text-muted-foreground">
                  Relationship Status
                </span>
                <p>{profile.relationship_status}</p>
              </div>
            )}
            {profile.looking_for && profile.looking_for.length > 0 && (
              <div>
                <span className="text-sm text-muted-foreground">
                  Looking For
                </span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {profile.looking_for.map((item) => (
                    <Badge key={item} variant="outline">
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Professional Section */}
      {(profile.occupation ||
        profile.industry ||
        profile.education_level ||
        profile.university) && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Professional
            </h2>
          </CardHeader>
          <CardContent className="space-y-4">
            {profile.occupation && (
              <div>
                <span className="text-sm text-muted-foreground">
                  Occupation
                </span>
                <p>{profile.occupation}</p>
              </div>
            )}
            {profile.industry && (
              <div>
                <span className="text-sm text-muted-foreground">Industry</span>
                <p>{profile.industry}</p>
              </div>
            )}
            {(profile.education_level || profile.university) && (
              <div className="flex items-start gap-2">
                <GraduationCap className="h-4 w-4 mt-1 text-muted-foreground" />
                <div>
                  {profile.education_level && <p>{profile.education_level}</p>}
                  {profile.university && (
                    <p className="text-sm text-muted-foreground">
                      {profile.university}
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Social Links Section */}
      {profile.social_links &&
        Object.values(profile.social_links).some(Boolean) && (
          <Card>
            <CardHeader>
              <h2 className="font-semibold flex items-center gap-2">
                <LinkIcon className="h-4 w-4" />
                Social Links
              </h2>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {profile.social_links.instagram_url && (
                  <a
                    href={profile.social_links.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm hover:text-primary"
                  >
                    <Instagram className="h-5 w-5" />
                    Instagram
                  </a>
                )}
                {profile.social_links.x_url && (
                  <a
                    href={profile.social_links.x_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm hover:text-primary"
                  >
                    <svg
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    X
                  </a>
                )}
                {profile.social_links.tiktok_url && (
                  <a
                    href={profile.social_links.tiktok_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm hover:text-primary"
                  >
                    <svg
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                    </svg>
                    TikTok
                  </a>
                )}
                {profile.social_links.website_url && (
                  <a
                    href={profile.social_links.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm hover:text-primary"
                  >
                    <Globe className="h-5 w-5" />
                    Website
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        )}

      {/* Physical Attributes Section */}
      {(profile.height ||
        profile.weight ||
        profile.ethnicity ||
        profile.body_type) && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Physical Attributes</h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {profile.height && (
                <div>
                  <span className="text-sm text-muted-foreground">Height</span>
                  <p>{profile.height}</p>
                </div>
              )}
              {profile.weight && (
                <div>
                  <span className="text-sm text-muted-foreground">Weight</span>
                  <p>{profile.weight} lbs</p>
                </div>
              )}
              {profile.ethnicity && (
                <div>
                  <span className="text-sm text-muted-foreground">
                    Ethnicity
                  </span>
                  <p>{profile.ethnicity}</p>
                </div>
              )}
              {profile.body_type && (
                <div>
                  <span className="text-sm text-muted-foreground">
                    Body Type
                  </span>
                  <p>{profile.body_type}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
