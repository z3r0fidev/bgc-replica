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
  INDUSTRY_OPTIONS,
  EDUCATION_LEVEL_OPTIONS,
} from "@/types/profile";

interface ProfessionalTabProps {
  form: UseFormReturn<FieldValues>;
  privacySettings: PrivacySettings;
  onPrivacyChange: (field: string, level: PrivacyLevel) => void;
}

export function ProfessionalTab({
  form,
  privacySettings,
  onPrivacyChange,
}: ProfessionalTabProps) {
  return (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="occupation"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between">
              <FormLabel>Occupation</FormLabel>
              <PrivacyToggle
                field="occupation"
                value={privacySettings.occupation || "PUBLIC"}
                onChange={onPrivacyChange}
              />
            </div>
            <FormControl>
              <Input
                placeholder="Your job title or role"
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
        name="industry"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between">
              <FormLabel>Industry</FormLabel>
              <PrivacyToggle
                field="industry"
                value={privacySettings.industry || "PUBLIC"}
                onChange={onPrivacyChange}
              />
            </div>
            <Select
              onValueChange={field.onChange}
              value={field.value || ""}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {INDUSTRY_OPTIONS.map((option) => (
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
        name="education_level"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between">
              <FormLabel>Education Level</FormLabel>
              <PrivacyToggle
                field="education_level"
                value={privacySettings.education_level || "PUBLIC"}
                onChange={onPrivacyChange}
              />
            </div>
            <Select
              onValueChange={field.onChange}
              value={field.value || ""}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select education level" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {EDUCATION_LEVEL_OPTIONS.map((option) => (
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
        name="university"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between">
              <FormLabel>University / Alma Mater</FormLabel>
              <PrivacyToggle
                field="university"
                value={privacySettings.university || "PUBLIC"}
                onChange={onPrivacyChange}
              />
            </div>
            <FormControl>
              <Input
                placeholder="Where did you study?"
                {...field}
                value={field.value || ""}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
