"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { ProfileView } from "@/components/profile/view/ProfileView";
import { profileService } from "@/services/profileService";
import { Profile } from "@/types/profile";
import { useSession } from "next-auth/react";

export default function ProfilePage() {
  const params = useParams();
  const userId = params.id as string;
  const { data: session } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isOwner = session?.user?.id === userId;

  useEffect(() => {
    async function loadProfile() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await profileService.getPublicProfile(userId);
        setProfile(data);
      } catch (err) {
        setError("Failed to load profile");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    if (userId) {
      loadProfile();
    }
  }, [userId]);

  if (isLoading) {
    return (
      <div className="container max-w-3xl py-10 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="container max-w-3xl py-10">
        <div className="text-center py-20">
          <h2 className="text-xl font-semibold text-muted-foreground">
            {error || "Profile not found"}
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl py-10">
      <ProfileView profile={profile} isOwner={isOwner} />
    </div>
  );
}
