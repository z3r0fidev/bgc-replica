"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, User, Heart, Briefcase, Share2, FileText } from "lucide-react";
import { IdentityTab } from "@/components/profile/edit/tabs/IdentityTab";
import { LifestyleTab } from "@/components/profile/edit/tabs/LifestyleTab";
import { ProfessionalTab } from "@/components/profile/edit/tabs/ProfessionalTab";
import { SocialLinksTab } from "@/components/profile/edit/tabs/SocialLinksTab";
import { ProfileCompletionMeter } from "@/components/profile/ProfileCompletionMeter";
import { profileService } from "@/services/profileService";
import { profileUpdateSchema } from "@/lib/validations/profile";
import { Profile, PrivacyLevel, PrivacySettings } from "@/types/profile";

// Basic profile schema for the first tab
const basicProfileSchema = z.object({
  bio: z.string().max(500).optional().or(z.literal("")),
  height: z.string().optional().or(z.literal("")),
  weight: z.number().optional(),
  ethnicity: z.string().optional().or(z.literal("")),
  body_type: z.string().optional().or(z.literal("")),
  location_city: z.string().optional().or(z.literal("")),
  location_state: z.string().optional().or(z.literal("")),
});

// Combined schema
const fullProfileSchema = basicProfileSchema.merge(profileUpdateSchema);
type FullProfileFormData = z.infer<typeof fullProfileSchema>;

export default function ProfileEditPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({});
  const [activeTab, setActiveTab] = useState("basics");

  const form = useForm<FullProfileFormData>({
    resolver: zodResolver(fullProfileSchema),
    defaultValues: {
      // Basic fields
      bio: "",
      height: "",
      weight: undefined,
      ethnicity: "",
      body_type: "",
      location_city: "",
      location_state: "",
      // Identity fields
      display_name: "",
      pronouns: "",
      birthdate: "",
      gender_identity: "",
      // Lifestyle fields
      relationship_status: "",
      looking_for: [],
      // Professional fields
      occupation: "",
      industry: "",
      education_level: "",
      university: "",
      // Social links
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

        // Format birthdate for date input
        let formattedBirthdate = "";
        if (data.birthdate) {
          const date = new Date(data.birthdate);
          if (!isNaN(date.getTime())) {
            formattedBirthdate = date.toISOString().split("T")[0];
          }
        }

        form.reset({
          // Basic fields
          bio: data.bio || "",
          height: data.height || "",
          weight: data.weight || undefined,
          ethnicity: data.ethnicity || "",
          body_type: data.body_type || "",
          location_city: data.location_city || "",
          location_state: data.location_state || "",
          // Identity fields
          display_name: data.display_name || "",
          pronouns: data.pronouns || "",
          birthdate: formattedBirthdate,
          gender_identity: data.gender_identity || "",
          // Lifestyle fields
          relationship_status: data.relationship_status || "",
          looking_for: data.looking_for || [],
          // Professional fields
          occupation: data.occupation || "",
          industry: data.industry || "",
          education_level: data.education_level || "",
          university: data.university || "",
          // Social links
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

  async function onSubmit(values: FullProfileFormData) {
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
        // Basic fields
        bio: values.bio || undefined,
        height: values.height || undefined,
        weight: values.weight || undefined,
        ethnicity: values.ethnicity || undefined,
        body_type: values.body_type || undefined,
        location_city: values.location_city || undefined,
        location_state: values.location_state || undefined,
        // Identity fields
        display_name: values.display_name || undefined,
        pronouns: values.pronouns || undefined,
        birthdate: values.birthdate || undefined,
        gender_identity: values.gender_identity || undefined,
        // Lifestyle fields
        relationship_status: values.relationship_status || undefined,
        looking_for: values.looking_for?.length ? values.looking_for : undefined,
        // Professional fields
        occupation: values.occupation || undefined,
        industry: values.industry || undefined,
        education_level: values.education_level || undefined,
        university: values.university || undefined,
        // Social links
        social_links:
          cleanedSocialLinks && Object.keys(cleanedSocialLinks).length > 0
            ? cleanedSocialLinks
            : undefined,
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
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger
                    value="basics"
                    className="flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    <span className="hidden sm:inline">Basics</span>
                  </TabsTrigger>
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
                    <span className="hidden sm:inline">Work</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="social"
                    className="flex items-center gap-2"
                  >
                    <Share2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Social</span>
                  </TabsTrigger>
                </TabsList>

                {/* Basics Tab */}
                <TabsContent value="basics" className="mt-6 space-y-6">
                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>About Me</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tell us about yourself..."
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="height"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Height</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. 5ft 10in"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="weight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Weight (lbs)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              value={field.value || ""}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value
                                    ? Number(e.target.value)
                                    : undefined
                                )
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="ethnicity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ethnicity</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select ethnicity" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Black">Black</SelectItem>
                            <SelectItem value="Latino">Latino</SelectItem>
                            <SelectItem value="Mixed">Mixed</SelectItem>
                            <SelectItem value="White">White</SelectItem>
                            <SelectItem value="Asian">Asian</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="body_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Body Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select body type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Slim">Slim</SelectItem>
                            <SelectItem value="Average">Average</SelectItem>
                            <SelectItem value="Athletic">Athletic</SelectItem>
                            <SelectItem value="Muscular">Muscular</SelectItem>
                            <SelectItem value="Stocky">Stocky</SelectItem>
                            <SelectItem value="Heavy">Heavy</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="location_city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Your city"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="location_state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Your state"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Identity Tab */}
                <TabsContent value="identity" className="mt-6">
                  <IdentityTab
                    form={form}
                    privacySettings={privacySettings}
                    onPrivacyChange={handlePrivacyChange}
                  />
                </TabsContent>

                {/* Lifestyle Tab */}
                <TabsContent value="lifestyle" className="mt-6">
                  <LifestyleTab
                    form={form}
                    privacySettings={privacySettings}
                    onPrivacyChange={handlePrivacyChange}
                  />
                </TabsContent>

                {/* Professional Tab */}
                <TabsContent value="professional" className="mt-6">
                  <ProfessionalTab
                    form={form}
                    privacySettings={privacySettings}
                    onPrivacyChange={handlePrivacyChange}
                  />
                </TabsContent>

                {/* Social Links Tab */}
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
