"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  Loader2,
  RefreshCw,
  LogOut,
  Shield,
  Clock,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { sessionService } from "@/services/sessionService";
import { Session } from "@/types/session";

function getDeviceIcon(deviceType: string | null) {
  switch (deviceType) {
    case "mobile":
      return <Smartphone className="h-5 w-5" />;
    case "tablet":
      return <Tablet className="h-5 w-5" />;
    default:
      return <Monitor className="h-5 w-5" />;
  }
}

function formatDeviceInfo(session: Session): string {
  if (!session.device_info) {
    return "Unknown device";
  }

  const { browser, browser_version, os, os_version } = session.device_info;
  const parts: string[] = [];

  if (browser) {
    parts.push(browser_version ? `${browser} ${browser_version}` : browser);
  }

  if (os) {
    parts.push(os_version ? `${os} ${os_version}` : os);
  }

  return parts.length > 0 ? parts.join(" on ") : "Unknown device";
}

function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return "Never";

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [isRevokingAll, setIsRevokingAll] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setIsLoading(true);
      const data = await sessionService.listSessions();
      setSessions(data.sessions);
    } catch {
      toast.error("Failed to load sessions");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevoke = async (sessionId: string) => {
    setRevokingId(sessionId);
    try {
      await sessionService.revokeSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      toast.success("Session revoked");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to revoke session"
      );
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeAll = async () => {
    setIsRevokingAll(true);
    try {
      const result = await sessionService.revokeAllSessions();
      setSessions((prev) => prev.filter((s) => s.is_current));
      toast.success(result.message);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to revoke sessions"
      );
    } finally {
      setIsRevokingAll(false);
    }
  };

  const otherSessions = sessions.filter((s) => !s.is_current);
  const currentSession = sessions.find((s) => s.is_current);

  if (isLoading) {
    return (
      <div className="container max-w-2xl py-10 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Active Sessions
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage devices where you&apos;re signed in
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={fetchSessions}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Current Session */}
      {currentSession && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              {getDeviceIcon(currentSession.device_info?.device_type ?? null)}
              Current Session
              <Badge variant="default" className="ml-2">
                This device
              </Badge>
            </CardTitle>
            <CardDescription>
              {formatDeviceInfo(currentSession)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              {currentSession.ip_address && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {currentSession.ip_address}
                </div>
              )}
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Active {formatRelativeTime(currentSession.last_active)}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Other Sessions */}
      {otherSessions.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Other Sessions ({otherSessions.length})
              </CardTitle>
              <CardDescription>
                Sessions on other devices or browsers
              </CardDescription>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={isRevokingAll}
                >
                  {isRevokingAll ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <LogOut className="h-4 w-4 mr-2" />
                  )}
                  Sign out all
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Sign out all other sessions?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will sign you out on all other devices. You&apos;ll stay
                    signed in on this device.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRevokeAll}>
                    Sign out all
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardHeader>
          <CardContent className="space-y-4">
            {otherSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between py-3 border-b last:border-0"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    {getDeviceIcon(session.device_info?.device_type ?? null)}
                  </div>
                  <div>
                    <p className="font-medium">{formatDeviceInfo(session)}</p>
                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-1">
                      {session.ip_address && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {session.ip_address}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatRelativeTime(session.last_active)}
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRevoke(session.id)}
                  disabled={revokingId === session.id}
                >
                  {revokingId === session.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Sign out"
                  )}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* No Other Sessions */}
      {otherSessions.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium">No other active sessions</h3>
            <p className="text-sm text-muted-foreground mt-1">
              You&apos;re only signed in on this device.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Security Tips */}
      <Card className="bg-muted/50">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground">
            <strong>Security tip:</strong> If you see a session you don&apos;t
            recognize, sign out of it immediately and consider changing your
            password.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
