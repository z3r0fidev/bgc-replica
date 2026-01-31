import { useState, useCallback } from "react";
import { PrivacyLevel, PrivacySettings } from "@/types/profile";
import { profileService } from "@/services/profileService";
import { toast } from "sonner";

interface UseProfilePrivacyOptions {
  initialSettings?: PrivacySettings;
  autoSave?: boolean;
}

interface UseProfilePrivacyReturn {
  privacySettings: PrivacySettings;
  setFieldPrivacy: (field: string, level: PrivacyLevel) => void;
  savePrivacySettings: () => Promise<void>;
  isSaving: boolean;
  hasChanges: boolean;
  resetChanges: () => void;
}

/**
 * Hook for managing profile field privacy settings.
 *
 * @example
 * ```tsx
 * const { privacySettings, setFieldPrivacy, savePrivacySettings } = useProfilePrivacy({
 *   initialSettings: profile.privacy_settings,
 * });
 *
 * // In a form field
 * <PrivacyToggle
 *   field="pronouns"
 *   value={privacySettings.pronouns || "PUBLIC"}
 *   onChange={setFieldPrivacy}
 * />
 * ```
 */
export function useProfilePrivacy({
  initialSettings = {},
  autoSave = false,
}: UseProfilePrivacyOptions = {}): UseProfilePrivacyReturn {
  const [privacySettings, setPrivacySettings] =
    useState<PrivacySettings>(initialSettings);
  const [originalSettings, setOriginalSettings] =
    useState<PrivacySettings>(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<PrivacySettings>({});

  const hasChanges =
    JSON.stringify(privacySettings) !== JSON.stringify(originalSettings);

  const setFieldPrivacy = useCallback(
    (field: string, level: PrivacyLevel) => {
      setPrivacySettings((prev) => ({
        ...prev,
        [field]: level,
      }));

      setPendingChanges((prev) => ({
        ...prev,
        [field]: level,
      }));

      if (autoSave) {
        // Debounced auto-save could be implemented here
        profileService
          .updatePrivacySettings({ [field]: level })
          .catch((error) => {
            console.error("Failed to auto-save privacy setting:", error);
            toast.error("Failed to save privacy setting");
          });
      }
    },
    [autoSave]
  );

  const savePrivacySettings = useCallback(async () => {
    if (Object.keys(pendingChanges).length === 0) {
      return;
    }

    setIsSaving(true);
    try {
      const result = await profileService.updatePrivacySettings(pendingChanges);
      setOriginalSettings(result.privacy_settings);
      setPrivacySettings(result.privacy_settings);
      setPendingChanges({});
      toast.success("Privacy settings saved");
    } catch (error) {
      console.error("Failed to save privacy settings:", error);
      toast.error("Failed to save privacy settings");
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [pendingChanges]);

  const resetChanges = useCallback(() => {
    setPrivacySettings(originalSettings);
    setPendingChanges({});
  }, [originalSettings]);

  return {
    privacySettings,
    setFieldPrivacy,
    savePrivacySettings,
    isSaving,
    hasChanges,
    resetChanges,
  };
}
