"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Loader2,
  RefreshCw,
  AlertCircle,
  Filter,
  ChevronLeft,
  ChevronRight,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { adminService } from "@/services/adminService";
import { AdminActionLogItem } from "@/types/admin";

const actionColors: Record<string, string> = {
  SUSPEND_USER: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  BAN_USER: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  RESTORE_FROM_BAN: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  RESTORE_FROM_SUSPENSION: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  GRANT_ADMIN: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  REVOKE_ADMIN: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  UPDATE_USER: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<AdminActionLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [actionFilter, setActionFilter] = useState<string>("all");

  // Pagination
  const [page, setPage] = useState(0);
  const limit = 50;

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params: {
        action?: string;
        limit: number;
        offset: number;
      } = {
        limit,
        offset: page * limit,
      };

      if (actionFilter !== "all") {
        params.action = actionFilter;
      }

      const data = await adminService.getActionLogs(params);
      setLogs(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load logs");
    } finally {
      setIsLoading(false);
    }
  }, [page, actionFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  const formatAction = (action: string): string => {
    return action
      .split("_")
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ");
  };

  const totalPages = Math.ceil(total / limit);

  if (error) {
    return (
      <div className="p-8">
        <Card className="p-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
          <h2 className="text-lg font-medium">Error Loading Logs</h2>
          <p className="text-muted-foreground mt-1">{error}</p>
          <Button onClick={fetchLogs} className="mt-4">
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
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <History className="h-8 w-8" />
            Action Logs
          </h1>
          <p className="text-muted-foreground mt-1">
            Audit trail of all admin actions
          </p>
        </div>
        <Button variant="outline" onClick={fetchLogs} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select
              value={actionFilter}
              onValueChange={(value) => {
                setActionFilter(value);
                setPage(0);
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="SUSPEND_USER">Suspend User</SelectItem>
                <SelectItem value="BAN_USER">Ban User</SelectItem>
                <SelectItem value="RESTORE_FROM_BAN">Restore from Ban</SelectItem>
                <SelectItem value="RESTORE_FROM_SUSPENSION">
                  Restore from Suspension
                </SelectItem>
                <SelectItem value="GRANT_ADMIN">Grant Admin</SelectItem>
                <SelectItem value="REVOKE_ADMIN">Revoke Admin</SelectItem>
                <SelectItem value="UPDATE_USER">Update User</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead>Target User</TableHead>
              <TableHead>Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No action logs found
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm">
                    {formatDate(log.created_at)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={actionColors[log.action] || "bg-gray-100 text-gray-800"}
                    >
                      {formatAction(log.action)}
                    </Badge>
                  </TableCell>
                  <TableCell>{log.admin_name || "System"}</TableCell>
                  <TableCell>{log.target_user_name || "—"}</TableCell>
                  <TableCell className="max-w-[300px] truncate">
                    {log.reason || "—"}
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
    </div>
  );
}
