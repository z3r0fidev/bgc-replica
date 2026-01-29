"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Globe, Users, Lock } from "lucide-react";
import { PrivacyLevel } from "@/types/profile";

interface PrivacyToggleProps {
  field: string;
  value: PrivacyLevel;
  onChange: (field: string, level: PrivacyLevel) => void;
}

const privacyOptions: {
  value: PrivacyLevel;
  label: string;
  icon: React.ReactNode;
}[] = [
  { value: "PUBLIC", label: "Public", icon: <Globe className="h-4 w-4" /> },
  {
    value: "FRIENDS_ONLY",
    label: "Friends Only",
    icon: <Users className="h-4 w-4" />,
  },
  { value: "PRIVATE", label: "Private", icon: <Lock className="h-4 w-4" /> },
];

export function PrivacyToggle({ field, value, onChange }: PrivacyToggleProps) {
  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(field, v as PrivacyLevel)}
    >
      <SelectTrigger
        className="w-[140px] h-8 text-xs"
        data-testid={`privacy-toggle-${field}`}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {privacyOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <div className="flex items-center gap-2">
              {option.icon}
              <span>{option.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
