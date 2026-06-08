"use client";

import { useMemo } from "react";
import { Profile } from "@/types/profile";

interface ProfileCompletionMeterProps {
  profile: Profile;
}

const TRACKED_FIELDS = [
  "display_name",
  "pronouns",
  "birthdate",
  "gender_identity",
  "relationship_status",
  "looking_for",
  "occupation",
  "industry",
  "education_level",
  "university",
  "social_links",
  "bio",
  "location_city",
] as const;

export function ProfileCompletionMeter({ profile }: ProfileCompletionMeterProps) {
  const { percentage, filledCount, totalCount } = useMemo(() => {
    let filled = 0;
    const total = TRACKED_FIELDS.length;

    TRACKED_FIELDS.forEach((field) => {
      const value = profile[field as keyof Profile];
      if (value !== null && value !== undefined && value !== "") {
        if (Array.isArray(value) && value.length > 0) {
          filled++;
        } else if (
          typeof value === "object" &&
          Object.keys(value).some(
            (k) => value[k as keyof typeof value] !== null && value[k as keyof typeof value] !== ""
          )
        ) {
          filled++;
        } else if (typeof value === "string" && value.trim()) {
          filled++;
        } else if (typeof value !== "object" && typeof value !== "string") {
          filled++;
        }
      }
    });

    return {
      percentage: Math.round((filled / total) * 100),
      filledCount: filled,
      totalCount: total,
    };
  }, [profile]);

  const getColor = () => {
    if (percentage >= 80) return "bg-green-500";
    if (percentage >= 50) return "bg-yellow-500";
    if (percentage >= 25) return "bg-orange-500";
    return "bg-red-500";
  };

  const getLabel = () => {
    if (percentage >= 80) return "Robust";
    if (percentage >= 50) return "Social";
    if (percentage >= 25) return "Basic";
    return "Incomplete";
  };

  return (
    <div className="w-full space-y-2 p-4 bg-muted/50 rounded-lg">
      <div className="flex justify-between text-sm">
        <span className="font-medium">Profile Completion</span>
        <span className="text-muted-foreground">
          {filledCount}/{totalCount} fields ({percentage}%)
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${getColor()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Status: <span className="font-semibold">{getLabel()}</span>
      </p>
    </div>
  );
}
