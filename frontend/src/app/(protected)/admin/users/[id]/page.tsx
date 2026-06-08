"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  RefreshCw,
  Shield,
  Ban,
  Undo2,
  ShieldOff,
  Mail,
  Calendar,
  MapPin,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { adminService } from "@/services/adminService";
import { AdminUserDetail, AdminActionLogItem } from "@/types/admin";

type ActionType = "suspend" | "ban" | "restore" | "make-admin" | "revoke-admin";

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [actionLogs, setActionLogs] = useState<AdminActionLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Action dialog
  const [actionType, setActionType] = useState<ActionType | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [suspendDuration, setSuspendDuration] = useState<string>("24");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [userData, logsData] = await Promise.all([
        adminService.getUser(userId),
        adminService.getActionLogs({ target_user_id: userId, limit: 20 }),
      ]);
      setUser(userData);
      setActionLogs(logsData.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load user");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userId]);

  const openActionDialog = (action: ActionType) => {
    setActionType(action);
    setActionReason("");
    setSuspendDuration("24");
  };

  const closeActionDialog = () => {
    setActionType(null);
    setActionReason("");
  };

  const handleAction = async () => {
    if (!user || !actionType) return;

    setIsSubmitting(true);
    try {
      switch (actionType) {
        case "suspend":
          await adminService.suspendUser(user.id, {
            reason: actionReason,
            duration_hours: parseInt(suspendDuration),
          });
          toast.success("User suspended");
          break;
        case "ban":
          await adminService.banUser(user.id, { reason: actionReason });
          toast.success("User banned");
          break;
        case "restore":
          await adminService.restoreUser(user.id);
          toast.success("User restored");
          break;
        case "make-admin":
          await adminService.makeAdmin(user.id);
          toast.success("Admin privileges granted");
          break;
        case "revoke-admin":
          await adminService.revokeAdmin(user.id);
          toast.success("Admin privileges revoked");
          break;
      }
      closeActionDialog();
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (name: string | null): string => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleString();
  };

  const getUserStatus = (): string => {
    if (!user) return "unknown";
    if (user.banned_at) return "banned";
    if (user.suspended_at && user.suspended_until) {
      const until = new Date(user.suspended_until);
      if (until > new Date()) return "suspended";
    }
    if (!user.is_active) return "inactive";
    return "active";
  };

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="p-8">
        <Card className="p-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
          <h2 className="text-lg font-medium">Error Loading User</h2>
          <p className="text-muted-foreground mt-1">{error || "User not found"}</p>
          <div className="flex justify-center gap-4 mt-4">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button onClick={fetchData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const status = getUserStatus();

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">User Details</h1>
          <p className="text-muted-foreground mt-1">
            View and manage user account
          </p>
        </div>
        <Button variant="outline" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Profile Card */}
        <Card className="lg:col-span-1">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-24 w-24">
                <AvatarImage src={user.image || undefined} />
                <AvatarFallback className="text-2xl">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>

              <h2 className="mt-4 text-xl font-semibold">
                {user.name || "Unknown"}
              </h2>

              <div className="flex items-center gap-2 mt-2">
                {status === "banned" && (
                  <Badge variant="destructive">Banned</Badge>
                )}
                {status === "suspended" && (
                  <Badge className="bg-orange-500">Suspended</Badge>
                )}
                {status === "inactive" && (
                  <Badge variant="secondary">Inactive</Badge>
                )}
                {status === "active" && (
                  <Badge variant="outline">Active</Badge>
                )}

                {user.is_superuser && (
                  <Badge className="bg-yellow-500">Admin</Badge>
                )}
              </div>

              {user.profile_display_name && (
                <p className="text-sm text-muted-foreground mt-2">
                  Display name: {user.profile_display_name}
                </p>
              )}
            </div>

            <Separator className="my-6" />

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">
                    {user.email || "—"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {user.email_verified ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                )}
                <div>
                  <p className="text-sm font-medium">Email Verified</p>
                  <p className="text-sm text-muted-foreground">
                    {user.email_verified ? "Verified" : "Not verified"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Joined</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(user.created_at)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Last Login</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(user.last_login_at)}
                  </p>
                </div>
              </div>

              {(user.profile_location_city || user.profile_location_state) && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Location</p>
                    <p className="text-sm text-muted-foreground">
                      {[user.profile_location_city, user.profile_location_state]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">2FA</p>
                  <p className="text-sm text-muted-foreground">
                    {user.totp_enabled ? "Enabled" : "Not enabled"}
                  </p>
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Action Buttons */}
            <div className="space-y-2">
              {status === "active" && (
                <>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-orange-600"
                    onClick={() => openActionDialog("suspend")}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Suspend User
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-red-600"
                    onClick={() => openActionDialog("ban")}
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    Ban User
                  </Button>
                </>
              )}

              {(status === "suspended" || status === "banned") && (
                <Button
                  variant="outline"
                  className="w-full justify-start text-green-600"
                  onClick={() => openActionDialog("restore")}
                >
                  <Undo2 className="h-4 w-4 mr-2" />
                  Restore User
                </Button>
              )}

              {user.is_superuser ? (
                <Button
                  variant="outline"
                  className="w-full justify-start text-yellow-600"
                  onClick={() => openActionDialog("revoke-admin")}
                >
                  <ShieldOff className="h-4 w-4 mr-2" />
                  Revoke Admin
                </Button>
              ) : (
                status === "active" && (
                  <Button
                    variant="outline"
                    className="w-full justify-start text-yellow-600"
                    onClick={() => openActionDialog("make-admin")}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Make Admin
                  </Button>
                )
              )}

              <Button
                variant="outline"
                className="w-full justify-start"
                asChild
              >
                <Link href={`/profile/${user.id}`}>View Public Profile</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Details and History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Suspension/Ban Info */}
          {(status === "suspended" || status === "banned") && (
            <Card className="border-orange-200 dark:border-orange-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-600">
                  <AlertCircle className="h-5 w-5" />
                  {status === "banned" ? "Account Banned" : "Account Suspended"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {status === "banned" && (
                  <>
                    <p className="text-sm">
                      <span className="font-medium">Ban Date:</span>{" "}
                      {formatDate(user.banned_at)}
                    </p>
                    <p className="text-sm mt-2">
                      <span className="font-medium">Reason:</span>{" "}
                      {user.ban_reason || "No reason provided"}
                    </p>
                  </>
                )}
                {status === "suspended" && (
                  <>
                    <p className="text-sm">
                      <span className="font-medium">Suspended At:</span>{" "}
                      {formatDate(user.suspended_at)}
                    </p>
                    <p className="text-sm mt-2">
                      <span className="font-medium">Suspended Until:</span>{" "}
                      {formatDate(user.suspended_until)}
                    </p>
                    <p className="text-sm mt-2">
                      <span className="font-medium">Reason:</span>{" "}
                      {user.suspension_reason || "No reason provided"}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Action History */}
          <Card>
            <CardHeader>
              <CardTitle>Action History</CardTitle>
            </CardHeader>
            <CardContent>
              {actionLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No admin actions recorded for this user
                </p>
              ) : (
                <div className="space-y-4">
                  {actionLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{log.action}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(log.created_at)}
                          </span>
                        </div>
                        <p className="text-sm mt-1">
                          By: {log.admin_name || "System"}
                        </p>
                        {log.reason && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Reason: {log.reason}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action Dialog */}
      <Dialog open={!!actionType} onOpenChange={() => closeActionDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "suspend" && "Suspend User"}
              {actionType === "ban" && "Ban User"}
              {actionType === "restore" && "Restore User"}
              {actionType === "make-admin" && "Grant Admin Privileges"}
              {actionType === "revoke-admin" && "Revoke Admin Privileges"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "suspend" &&
                "Temporarily restrict this user's access."}
              {actionType === "ban" && "Permanently ban this user."}
              {actionType === "restore" && "Restore this user's access."}
              {actionType === "make-admin" && "Grant full admin privileges."}
              {actionType === "revoke-admin" && "Remove admin privileges."}
            </DialogDescription>
          </DialogHeader>

          {(actionType === "suspend" || actionType === "ban") && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  placeholder="Enter reason for this action..."
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  rows={3}
                />
              </div>

              {actionType === "suspend" && (
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration</Label>
                  <Select value={suspendDuration} onValueChange={setSuspendDuration}>
                    <SelectTrigger id="duration">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 hour</SelectItem>
                      <SelectItem value="24">24 hours</SelectItem>
                      <SelectItem value="72">3 days</SelectItem>
                      <SelectItem value="168">1 week</SelectItem>
                      <SelectItem value="720">30 days</SelectItem>
                      <SelectItem value="8760">1 year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeActionDialog} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={
                isSubmitting ||
                ((actionType === "suspend" || actionType === "ban") &&
                  actionReason.length < 5)
              }
              variant={actionType === "ban" ? "destructive" : "default"}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
