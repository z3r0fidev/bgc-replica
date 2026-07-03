import * as z from "zod";

// URL validation patterns (matching backend)
const instagramPattern = /^https:\/\/(www\.)?instagram\.com\/[\w.]+\/?$/i;
const xPattern = /^https:\/\/(www\.)?(twitter\.com|x\.com)\/[\w]+\/?$/i;
const tiktokPattern = /^https:\/\/(www\.)?tiktok\.com\/@[\w.]+\/?$/i;
const websitePattern = /^https:\/\/[\w.-]+\.[a-z]{2,}(\/.*)?$/i;

export const socialLinksSchema = z.object({
  instagram_url: z
    .string()
    .optional()
    .refine((val) => !val || instagramPattern.test(val), {
      message: "Must be a valid Instagram URL (https://instagram.com/username)",
    }),
  x_url: z
    .string()
    .optional()
    .refine((val) => !val || xPattern.test(val), {
      message: "Must be a valid X/Twitter URL (https://x.com/username)",
    }),
  tiktok_url: z
    .string()
    .optional()
    .refine((val) => !val || tiktokPattern.test(val), {
      message: "Must be a valid TikTok URL (https://tiktok.com/@username)",
    }),
  website_url: z
    .string()
    .optional()
    .refine((val) => !val || websitePattern.test(val), {
      message: "Must be a valid HTTPS URL",
    }),
});

export const identityTabSchema = z.object({
  display_name: z
    .string()
    .min(2, "Display name must be at least 2 characters")
    .max(255)
    .optional()
    .or(z.literal("")),
  bio: z.string().max(500, "Bio must be 500 characters or fewer").optional().or(z.literal("")),
  pronouns: z.string().optional().or(z.literal("")),
  birthdate: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine(
      (val) => {
        if (!val) return true;
        const date = new Date(val);
        if (isNaN(date.getTime())) return true; // Let empty pass
        const age = Math.floor(
          (Date.now() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
        );
        return age >= 18;
      },
      { message: "Must be at least 18 years old" }
    ),
  gender_identity: z.string().optional().or(z.literal("")),
});

export const lifestyleTabSchema = z.object({
  relationship_status: z.string().optional().or(z.literal("")),
  looking_for: z.array(z.string()).optional(),
});

export const professionalTabSchema = z.object({
  occupation: z.string().max(255).optional().or(z.literal("")),
  industry: z.string().optional().or(z.literal("")),
  education_level: z.string().optional().or(z.literal("")),
  university: z.string().max(255).optional().or(z.literal("")),
});

export const socialLinksTabSchema = z.object({
  social_links: socialLinksSchema.optional(),
});

// Combined schema for full profile update
export const profileUpdateSchema = identityTabSchema
  .merge(lifestyleTabSchema)
  .merge(professionalTabSchema)
  .merge(socialLinksTabSchema);

export type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>;
