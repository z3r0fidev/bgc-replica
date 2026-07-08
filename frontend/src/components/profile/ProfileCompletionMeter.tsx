"use client";

import { useEffect } from "react";
import { Profile, ProfileCompletion, CompletionTip } from "@/types/profile";
import { CircularProgress } from "@/components/ui/circular-progress";
import { CompletionTips } from "./CompletionTips";
import { MilestoneTracker } from "./MilestoneTracker";
import { useProfileCompletion } from "@/hooks/use-profile-completion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronDown, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface ProfileCompletionMeterProps {
  profile: Profile;
  onSuggestionClick?: (tip: CompletionTip) => void;
  compact?: boolean;
}

// Fallback calculation for when API isn't available
function calculateFallbackCompletion(profile: Profile): ProfileCompletion {
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
          (k) =>
            value[k as keyof typeof value] !== null &&
            value[k as keyof typeof value] !== ""
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

  const rawPct = Math.round((filled / total) * 100);
  const percentage = Math.min(100, 20 + Math.round(rawPct * 0.8));

  return {
    percentage,
    raw_percentage: rawPct,
    critical_filled: filled,
    critical_total: total,
    important_filled: 0,
    important_total: 0,
    nice_to_have_filled: 0,
    nice_to_have_total: 0,
    suggestions: [],
    milestones: [
      { level: 1, name: "Beginner", threshold: 25, reached: percentage >= 25, badge_icon: "seedling" },
      { level: 2, name: "Explorer", threshold: 50, reached: percentage >= 50, badge_icon: "compass" },
      { level: 3, name: "Socialite", threshold: 75, reached: percentage >= 75, badge_icon: "star" },
      { level: 4, name: "Complete", threshold: 95, reached: percentage >= 95, badge_icon: "trophy" },
    ],
    current_milestone: percentage >= 95 ? "Complete" : percentage >= 75 ? "Socialite" : percentage >= 50 ? "Explorer" : percentage >= 25 ? "Beginner" : "None",
    next_milestone: percentage >= 95 ? undefined : percentage >= 75 ? "Complete" : percentage >= 50 ? "Socialite" : percentage >= 25 ? "Explorer" : "Beginner",
    status_label: percentage >= 80 ? "Robust" : percentage >= 50 ? "Social" : percentage >= 25 ? "Basic" : "Incomplete",
    feature_unlocks: [
      { threshold: 40, name: "Search Visibility", description: "Profile visible in search", unlocked: percentage >= 40 },
      { threshold: 60, name: "Priority Recommendations", description: "Appear higher in recommendations", unlocked: percentage >= 60 },
      { threshold: 80, name: "Verified Badge Eligible", description: "Eligible for verified badge", unlocked: percentage >= 80 },
    ],
  };
}

export function ProfileCompletionMeter({
  profile,
  onSuggestionClick,
  compact = false,
}: ProfileCompletionMeterProps) {
  const { completion: apiCompletion, isLoading, error, refetch } = useProfileCompletion();
  const [isOpen, setIsOpen] = useState(!compact);

  // Use API data if available, otherwise calculate locally
  const completion = apiCompletion || calculateFallbackCompletion(profile);

  // Refetch when profile changes
  useEffect(() => {
    if (profile && !isLoading) {
      refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id]);

  if (isLoading && !apiCompletion) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Skeleton className="h-28 w-28 rounded-full" />
        </CardContent>
      </Card>
    );
  }

  const handleTipClick = (tip: CompletionTip) => {
    onSuggestionClick?.(tip);
  };

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center justify-between w-full text-left"
          >
            <CardTitle className="text-base flex items-center gap-3">
              <CircularProgress
                percentage={completion.percentage}
                size={48}
                strokeWidth={4}
                showPercentage={false}
              />
              <div>
                <span>Profile Completion</span>
                <span className="ml-2 text-2xl font-bold">{completion.percentage}%</span>
              </div>
            </CardTitle>
            <ChevronDown
              className={cn(
                "h-5 w-5 text-muted-foreground transition-transform",
                isOpen && "rotate-180"
              )}
            />
          </button>
        </CardHeader>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <CardContent className="pt-0 space-y-4">
                <CompletionTips tips={completion.suggestions} onTipClick={handleTipClick} />
                <MilestoneTracker
                  milestones={completion.milestones}
                  currentMilestone={completion.current_milestone}
                  nextMilestone={completion.next_milestone}
                  featureUnlocks={completion.feature_unlocks}
                />
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Profile Completion</CardTitle>
          {error && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main progress display */}
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <CircularProgress
            percentage={completion.percentage}
            size={140}
            strokeWidth={10}
            label={completion.status_label}
            sublabel={`${completion.critical_filled + completion.important_filled + completion.nice_to_have_filled} fields`}
          />
          <div className="flex-1 space-y-3 w-full">
            {/* Category breakdown */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-md">
                <p className="text-lg font-bold text-red-600 dark:text-red-400">
                  {completion.critical_filled}/{completion.critical_total}
                </p>
                <p className="text-[10px] text-muted-foreground">Critical</p>
              </div>
              <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                  {completion.important_filled}/{completion.important_total}
                </p>
                <p className="text-[10px] text-muted-foreground">Important</p>
              </div>
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {completion.nice_to_have_filled}/{completion.nice_to_have_total}
                </p>
                <p className="text-[10px] text-muted-foreground">Nice to Have</p>
              </div>
            </div>
          </div>
        </div>

        {/* Suggestions */}
        {completion.suggestions.length > 0 && (
          <CompletionTips tips={completion.suggestions} onTipClick={handleTipClick} />
        )}

        {/* Milestones and Feature Unlocks */}
        <MilestoneTracker
          milestones={completion.milestones}
          currentMilestone={completion.current_milestone}
          nextMilestone={completion.next_milestone}
          featureUnlocks={completion.feature_unlocks}
        />
      </CardContent>
    </Card>
  );
}
