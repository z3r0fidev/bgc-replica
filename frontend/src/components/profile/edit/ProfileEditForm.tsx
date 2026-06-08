"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IdentityTab } from "./tabs/IdentityTab";
import { LifestyleTab } from "./tabs/LifestyleTab";
import { ProfessionalTab } from "./tabs/ProfessionalTab";
import { SocialLinksTab } from "./tabs/SocialLinksTab";
import { ProfileCompletionMeter } from "../ProfileCompletionMeter";
import { profileService } from "@/services/profileService";
import {
  profileUpdateSchema,
  ProfileUpdateFormData,
} from "@/lib/validations/profile";
import { Profile, PrivacyLevel, PrivacySettings } from "@/types/profile";
import { User, Briefcase, Heart, Share2, Loader2 } from "lucide-react";

export function ProfileEditForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({});
  const [activeTab, setActiveTab] = useState("identity");

  const form = useForm<ProfileUpdateFormData>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      display_name: "",
      pronouns: "",
      birthdate: "",
      gender_identity: "",
      relationship_status: "",
      looking_for: [],
      occupation: "",
      industry: "",
      education_level: "",
      university: "",
      social_links: {
        instagram_url: "",
        x_url: "",
        tiktok_url: "",
        website_url: "",
      },
    },
  });

  useEffect(() => {
    async function loadProfile() {
      try {
        setIsFetching(true);
        const data = await profileService.getMyProfile();
        setProfile(data);
        setPrivacySettings(data.privacy_settings || {});

        // Format birthdate for date input (YYYY-MM-DD)
        let formattedBirthdate = "";
        if (data.birthdate) {
          const date = new Date(data.birthdate);
          if (!isNaN(date.getTime())) {
            formattedBirthdate = date.toISOString().split("T")[0];
          }
        }

        form.reset({
          display_name: data.display_name || "",
          pronouns: data.pronouns || "",
          birthdate: formattedBirthdate,
          gender_identity: data.gender_identity || "",
          relationship_status: data.relationship_status || "",
          looking_for: data.looking_for || [],
          occupation: data.occupation || "",
          industry: data.industry || "",
          education_level: data.education_level || "",
          university: data.university || "",
          social_links: {
            instagram_url: data.social_links?.instagram_url || "",
            x_url: data.social_links?.x_url || "",
            tiktok_url: data.social_links?.tiktok_url || "",
            website_url: data.social_links?.website_url || "",
          },
        });
      } catch {
        toast.error("Failed to load profile");
      } finally {
        setIsFetching(false);
      }
    }
    loadProfile();
  }, [form]);

  const handlePrivacyChange = (field: string, level: PrivacyLevel) => {
    setPrivacySettings((prev) => ({ ...prev, [field]: level }));
  };

  async function onSubmit(values: ProfileUpdateFormData) {
    setIsLoading(true);
    try {
      // Clean up empty strings from social_links
      const cleanedSocialLinks = values.social_links
        ? Object.fromEntries(
            Object.entries(values.social_links).filter(
              ([, v]) => v && v.trim() !== ""
            )
          )
        : undefined;

      // Prepare profile data
      const profileData: Partial<Profile> = {
        ...values,
        social_links:
          cleanedSocialLinks && Object.keys(cleanedSocialLinks).length > 0
            ? cleanedSocialLinks
            : undefined,
        // Convert empty strings to undefined for optional fields
        display_name: values.display_name || undefined,
        pronouns: values.pronouns || undefined,
        birthdate: values.birthdate || undefined,
        gender_identity: values.gender_identity || undefined,
        relationship_status: values.relationship_status || undefined,
        occupation: values.occupation || undefined,
        industry: values.industry || undefined,
        education_level: values.education_level || undefined,
        university: values.university || undefined,
      };

      // Update profile data
      const updatedProfile = await profileService.updateProfile(profileData);
      setProfile(updatedProfile);

      // Update privacy settings if any are set
      const hasPrivacySettings = Object.keys(privacySettings).length > 0;
      if (hasPrivacySettings) {
        await profileService.updatePrivacySettings(privacySettings);
      }

      toast.success("Profile updated successfully!");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to update profile";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  if (isFetching) {
    return (
      <div className="container max-w-3xl py-10 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container max-w-3xl py-10">
      {profile && <ProfileCompletionMeter profile={profile} />}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Edit Profile</CardTitle>
          <CardDescription>
            Complete your profile to connect with others. Privacy controls are
            available for each field.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger
                    value="identity"
                    className="flex items-center gap-2"
                  >
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">Identity</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="lifestyle"
                    className="flex items-center gap-2"
                  >
                    <Heart className="h-4 w-4" />
                    <span className="hidden sm:inline">Lifestyle</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="professional"
                    className="flex items-center gap-2"
                  >
                    <Briefcase className="h-4 w-4" />
                    <span className="hidden sm:inline">Professional</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="social"
                    className="flex items-center gap-2"
                  >
                    <Share2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Social</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="identity" className="mt-6">
                  <IdentityTab
                    form={form}
                    privacySettings={privacySettings}
                    onPrivacyChange={handlePrivacyChange}
                  />
                </TabsContent>

                <TabsContent value="lifestyle" className="mt-6">
                  <LifestyleTab
                    form={form}
                    privacySettings={privacySettings}
                    onPrivacyChange={handlePrivacyChange}
                  />
                </TabsContent>

                <TabsContent value="professional" className="mt-6">
                  <ProfessionalTab
                    form={form}
                    privacySettings={privacySettings}
                    onPrivacyChange={handlePrivacyChange}
                  />
                </TabsContent>

                <TabsContent value="social" className="mt-6">
                  <SocialLinksTab
                    form={form}
                    privacySettings={privacySettings}
                    onPrivacyChange={handlePrivacyChange}
                  />
                </TabsContent>
              </Tabs>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
