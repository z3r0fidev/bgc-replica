"use client";

import { UseFormReturn, FieldValues } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
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
  RELATIONSHIP_STATUS_OPTIONS,
  LOOKING_FOR_OPTIONS,
} from "@/types/profile";

interface LifestyleTabProps {
  form: UseFormReturn<FieldValues>;
  privacySettings: PrivacySettings;
  onPrivacyChange: (field: string, level: PrivacyLevel) => void;
}

export function LifestyleTab({
  form,
  privacySettings,
  onPrivacyChange,
}: LifestyleTabProps) {
  const lookingForValue = form.watch("looking_for") || [];

  const handleLookingForChange = (option: string, checked: boolean) => {
    const current = form.getValues("looking_for") || [];
    if (checked) {
      form.setValue("looking_for", [...current, option], { shouldDirty: true });
    } else {
      form.setValue(
        "looking_for",
        current.filter((v: string) => v !== option),
        { shouldDirty: true }
      );
    }
  };

  return (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="relationship_status"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between">
              <FormLabel>Relationship Status</FormLabel>
              <PrivacyToggle
                field="relationship_status"
                value={privacySettings.relationship_status || "PUBLIC"}
                onChange={onPrivacyChange}
              />
            </div>
            <Select
              onValueChange={field.onChange}
              value={field.value || ""}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {RELATIONSHIP_STATUS_OPTIONS.map((option) => (
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

      <FormItem>
        <div className="flex items-center justify-between">
          <FormLabel>Looking For</FormLabel>
          <PrivacyToggle
            field="looking_for"
            value={privacySettings.looking_for || "PUBLIC"}
            onChange={onPrivacyChange}
          />
        </div>
        <FormDescription>Select all that apply</FormDescription>
        <div className="grid grid-cols-2 gap-3 mt-2">
          {LOOKING_FOR_OPTIONS.map((option) => (
            <label
              key={option}
              className={`flex items-center gap-2 p-3 border rounded-md cursor-pointer transition-colors ${
                lookingForValue.includes(option)
                  ? "bg-primary/10 border-primary"
                  : "hover:bg-muted"
              }`}
            >
              <input
                type="checkbox"
                checked={lookingForValue.includes(option)}
                onChange={(e) =>
                  handleLookingForChange(option, e.target.checked)
                }
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm">{option}</span>
            </label>
          ))}
        </div>
        <FormMessage />
      </FormItem>
    </div>
  );
}
