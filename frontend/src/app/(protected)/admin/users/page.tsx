"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Loader2,
  RefreshCw,
  AlertCircle,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  Ban,
  Shield,
  ShieldOff,
  Undo2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { toast } from "sonner";
import { adminService } from "@/services/adminService";
import { AdminUserListItem, UserSearchParams } from "@/types/admin";

type ActionType = "suspend" | "ban" | "restore" | "make-admin" | "revoke-admin";

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Pagination
  const [page, setPage] = useState(0);
  const limit = 20;

  // Action dialog
  const [selectedUser, setSelectedUser] = useState<AdminUserListItem | null>(null);
  const [actionType, setActionType] = useState<ActionType | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [suspendDuration, setSuspendDuration] = useState<string>("24");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params: UserSearchParams = {
        limit,
        offset: page * limit,
        sort_by: sortBy,
        sort_order: sortOrder,
      };

      if (searchQuery) params.query = searchQuery;

      if (statusFilter === "suspended") params.is_suspended = true;
      else if (statusFilter === "banned") params.is_banned = true;
      else if (statusFilter === "active") {
        params.is_active = true;
        params.is_banned = false;
        params.is_suspended = false;
      }

      if (roleFilter === "admin") params.is_superuser = true;
      else if (roleFilter === "user") params.is_superuser = false;

      const data = await adminService.getUsers(params);
      setUsers(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setIsLoading(false);
    }
  }, [page, searchQuery, statusFilter, roleFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchUsers();
  };

  const openActionDialog = (user: AdminUserListItem, action: ActionType) => {
    setSelectedUser(user);
    setActionType(action);
    setActionReason("");
    setSuspendDuration("24");
  };

  const closeActionDialog = () => {
    setSelectedUser(null);
    setActionType(null);
    setActionReason("");
  };

  const handleAction = async () => {
    if (!selectedUser || !actionType) return;

    setIsSubmitting(true);
    try {
      switch (actionType) {
        case "suspend":
          await adminService.suspendUser(selectedUser.id, {
            reason: actionReason,
            duration_hours: parseInt(suspendDuration),
          });
          toast.success("User suspended");
          break;
        case "ban":
          await adminService.banUser(selectedUser.id, { reason: actionReason });
          toast.success("User banned");
          break;
        case "restore":
          await adminService.restoreUser(selectedUser.id);
          toast.success("User restored");
          break;
        case "make-admin":
          await adminService.makeAdmin(selectedUser.id);
          toast.success("Admin privileges granted");
          break;
        case "revoke-admin":
          await adminService.revokeAdmin(selectedUser.id);
          toast.success("Admin privileges revoked");
          break;
      }
      closeActionDialog();
      fetchUsers();
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
    return new Date(dateString).toLocaleDateString();
  };

  const getUserStatus = (user: AdminUserListItem): string => {
    if (user.banned_at) return "banned";
    if (user.suspended_at && user.suspended_until) {
      const until = new Date(user.suspended_until);
      if (until > new Date()) return "suspended";
    }
    if (!user.is_active) return "inactive";
    return "active";
  };

  const getStatusBadge = (user: AdminUserListItem) => {
    const status = getUserStatus(user);
    switch (status) {
      case "banned":
        return <Badge variant="destructive">Banned</Badge>;
      case "suspended":
        return <Badge className="bg-orange-500">Suspended</Badge>;
      case "inactive":
        return <Badge variant="secondary">Inactive</Badge>;
      default:
        return <Badge variant="outline">Active</Badge>;
    }
  };

  const totalPages = Math.ceil(total / limit);

  if (error) {
    return (
      <div className="p-8">
        <Card className="p-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
          <h2 className="text-lg font-medium">Error Loading Users</h2>
          <p className="text-muted-foreground mt-1">{error}</p>
          <Button onClick={fetchUsers} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground mt-1">
            Search, view, and manage user accounts
          </p>
        </div>
        <Button variant="outline" onClick={fetchUsers} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </form>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="banned">Banned</SelectItem>
                </SelectContent>
              </Select>

              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Join Date</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="last_login_at">Last Login</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              >
                {sortOrder === "asc" ? "↑" : "↓"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.image || undefined} />
                        <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{user.name || "—"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.email || "—"}
                  </TableCell>
                  <TableCell>{getStatusBadge(user)}</TableCell>
                  <TableCell>
                    {user.is_superuser ? (
                      <Badge className="bg-yellow-500">Admin</Badge>
                    ) : (
                      <Badge variant="outline">User</Badge>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(user.created_at)}</TableCell>
                  <TableCell>{formatDate(user.last_login_at)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push(`/admin/users/${user.id}`)}
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>

                      {getUserStatus(user) === "active" && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openActionDialog(user, "suspend")}
                            title="Suspend"
                            className="text-orange-500 hover:text-orange-600"
                          >
                            <Shield className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openActionDialog(user, "ban")}
                            title="Ban"
                            className="text-red-500 hover:text-red-600"
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        </>
                      )}

                      {(getUserStatus(user) === "suspended" ||
                        getUserStatus(user) === "banned") && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openActionDialog(user, "restore")}
                          title="Restore"
                          className="text-green-500 hover:text-green-600"
                        >
                          <Undo2 className="h-4 w-4" />
                        </Button>
                      )}

                      {user.is_superuser ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openActionDialog(user, "revoke-admin")}
                          title="Revoke admin"
                          className="text-yellow-600 hover:text-yellow-700"
                        >
                          <ShieldOff className="h-4 w-4" />
                        </Button>
                      ) : (
                        getUserStatus(user) === "active" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openActionDialog(user, "make-admin")}
                            title="Make admin"
                            className="text-yellow-600 hover:text-yellow-700"
                          >
                            <Shield className="h-4 w-4" />
                          </Button>
                        )
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {page * limit + 1}-{Math.min((page + 1) * limit, total)} of{" "}
            {total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages - 1}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

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
                "Temporarily restrict this user's access to the platform."}
              {actionType === "ban" &&
                "Permanently ban this user from the platform."}
              {actionType === "restore" &&
                "Restore this user's access to the platform."}
              {actionType === "make-admin" &&
                "Grant this user full admin privileges."}
              {actionType === "revoke-admin" &&
                "Remove admin privileges from this user."}
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedUser.image || undefined} />
                  <AvatarFallback>{getInitials(selectedUser.name)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedUser.name || "Unknown"}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedUser.email}
                  </p>
                </div>
              </div>

              {(actionType === "suspend" || actionType === "ban") && (
                <>
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
                </>
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
              variant={
                actionType === "ban"
                  ? "destructive"
                  : actionType === "suspend"
                  ? "default"
                  : "default"
              }
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {actionType === "suspend" && "Suspend User"}
              {actionType === "ban" && "Ban User"}
              {actionType === "restore" && "Restore User"}
              {actionType === "make-admin" && "Grant Admin"}
              {actionType === "revoke-admin" && "Revoke Admin"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
