"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const USERNAME_RE = /^[a-zA-Z][a-zA-Z0-9_]{2,29}$/;

export function UsernameCard() {
  const [username, setUsername] = useState("");
  const [savedUsername, setSavedUsername] = useState("");
  const [isFetching, setIsFetching] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const token = localStorage.getItem("access_token");
        const response = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("Failed to load username");
        const data = await response.json();
        setUsername(data.username || "");
        setSavedUsername(data.username || "");
      } catch {
        toast.error("Failed to load username");
      } finally {
        setIsFetching(false);
      }
    };
    fetchMe();
  }, []);

  const handleSave = async () => {
    if (!USERNAME_RE.test(username)) {
      setError(
        "3-30 characters, must start with a letter, letters/numbers/underscores only."
      );
      return;
    }
    setError(null);
    setIsSaving(true);

    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch("/api/auth/username", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Failed to update username");
      }

      const data = await response.json();
      setUsername(data.username);
      setSavedUsername(data.username);
      toast.success("Username updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update username");
    } finally {
      setIsSaving(false);
    }
  };

  if (isFetching) {
    return null;
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Username</CardTitle>
        <CardDescription>Your unique @handle, used for mentions.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-2">
          <div className="flex-1 grid gap-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError(null);
              }}
              placeholder="johndoe"
              maxLength={30}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <Button
            onClick={handleSave}
            disabled={isSaving || username === savedUsername}
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
