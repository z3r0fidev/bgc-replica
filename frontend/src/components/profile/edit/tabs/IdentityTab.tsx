"use client";

import { UseFormReturn, FieldValues } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
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
import { PrivacyToggle } from "../PrivacyToggle";
import {
  PrivacyLevel,
  PrivacySettings,
  PRONOUNS_OPTIONS,
  GENDER_IDENTITY_OPTIONS,
} from "@/types/profile";

interface IdentityTabProps {
  form: UseFormReturn<FieldValues>;
  privacySettings: PrivacySettings;
  onPrivacyChange: (field: string, level: PrivacyLevel) => void;
}

export function IdentityTab({
  form,
  privacySettings,
  onPrivacyChange,
}: IdentityTabProps) {
  return (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="display_name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Display Name</FormLabel>
            <FormControl>
              <Input
                placeholder="How you want to be known"
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
        name="bio"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between">
              <FormLabel>About Me</FormLabel>
              <PrivacyToggle
                field="bio"
                value={privacySettings.bio || "PUBLIC"}
                onChange={onPrivacyChange}
              />
            </div>
            <FormControl>
              <Textarea
                placeholder="Tell others a bit about yourself"
                maxLength={500}
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
        name="pronouns"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between">
              <FormLabel>Pronouns</FormLabel>
              <PrivacyToggle
                field="pronouns"
                value={privacySettings.pronouns || "PUBLIC"}
                onChange={onPrivacyChange}
              />
            </div>
            <Select
              onValueChange={field.onChange}
              value={field.value || ""}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select pronouns" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {PRONOUNS_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="birthdate"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between">
              <FormLabel>Birthdate</FormLabel>
              <PrivacyToggle
                field="birthdate"
                value={privacySettings.birthdate || "PUBLIC"}
                onChange={onPrivacyChange}
              />
            </div>
            <FormControl>
              <Input type="date" {...field} value={field.value || ""} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="gender_identity"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between">
              <FormLabel>Gender Identity</FormLabel>
              <PrivacyToggle
                field="gender_identity"
                value={privacySettings.gender_identity || "PUBLIC"}
                onChange={onPrivacyChange}
              />
            </div>
            <Select
              onValueChange={field.onChange}
              value={field.value || ""}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender identity" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {GENDER_IDENTITY_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
