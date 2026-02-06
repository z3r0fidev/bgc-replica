"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  AlertTriangle,
  User,
  MessageSquare,
  FileText,
  CheckCircle,
  XCircle,
  Ban,
  AlertOctagon,
  Trash2,
  Loader2,
  RefreshCw,
  Filter,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { moderationService } from "@/services/moderationService";
import {
  ReportDetail,
  ModerationStats,
  ResolveAction,
} from "@/types/moderation";

const contentTypeIcons: Record<string, React.ReactNode> = {
  USER: <User className="h-4 w-4" />,
  THREAD: <FileText className="h-4 w-4" />,
  POST: <MessageSquare className="h-4 w-4" />,
  STATUS: <MessageSquare className="h-4 w-4" />,
};

const reasonColors: Record<string, string> = {
  HARASSMENT: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  SPAM: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  INAPPROPRIATE: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  FAKE_PROFILE: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  OTHER: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
};

export default function ModerationPage() {
  const router = useRouter();
  const [reports, setReports] = useState<ReportDetail[]>([]);
  const [stats, setStats] = useState<ModerationStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedReport, setSelectedReport] = useState<ReportDetail | null>(null);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, typeFilter]);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [reportsData, statsData] = await Promise.all([
        moderationService.getQueue({
          status: statusFilter,
          content_type: typeFilter === "all" ? undefined : typeFilter,
        }),
        moderationService.getStats(),
      ]);

      setReports(reportsData);
      setStats(statsData);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load data";
      setError(message);
      if (message === "Admin access required") {
        toast.error("You don't have permission to access this page");
        router.push("/");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolve = async (action: ResolveAction) => {
    if (!selectedReport) return;

    setIsResolving(true);
    try {
      await moderationService.resolveReport(selectedReport.id, action);
      toast.success(`Report ${action === "dismiss" ? "dismissed" : "resolved"}`);
      setShowActionDialog(false);
      setSelectedReport(null);
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resolve report");
    } finally {
      setIsResolving(false);
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

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  const getReasonCategory = (reason: string): string => {
    const category = reason.split(":")[0].trim();
    return category;
  };

  if (isLoading && !stats) {
    return (
      <div className="container py-10 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error && error !== "Admin access required") {
    return (
      <div className="container py-10">
        <Card className="p-8 text-center">
          <AlertOctagon className="h-12 w-12 mx-auto text-destructive mb-4" />
          <h2 className="text-lg font-medium">Error Loading Moderation Queue</h2>
          <p className="text-muted-foreground mt-1">{error}</p>
          <Button onClick={fetchData} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Moderation Queue
          </h1>
          <p className="text-muted-foreground mt-1">
            Review and manage reported content
          </p>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                {stats.pending_count}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Resolved Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {stats.resolved_today}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total_reports}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                By Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.reports_by_type).map(([type, count]) => (
                  <Badge key={type} variant="secondary">
                    {type}: {count}
                  </Badge>
                ))}
                {Object.keys(stats.reports_by_type).length === 0 && (
                  <span className="text-muted-foreground text-sm">None</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters:</span>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
            <SelectItem value="DISMISSED">Dismissed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="USER">Users</SelectItem>
            <SelectItem value="THREAD">Threads</SelectItem>
            <SelectItem value="POST">Posts</SelectItem>
            <SelectItem value="STATUS">Status Updates</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Reports List */}
      {reports.length === 0 ? (
        <Card className="p-8 text-center">
          <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
          <h2 className="text-lg font-medium">All Clear!</h2>
          <p className="text-muted-foreground mt-1">
            No {statusFilter.toLowerCase()} reports to review.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <Card key={report.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    {/* Content Type Icon */}
                    <div className="p-2 bg-muted rounded-lg">
                      {contentTypeIcons[report.content_type] || (
                        <AlertTriangle className="h-4 w-4" />
                      )}
                    </div>

                    {/* Report Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          className={
                            reasonColors[getReasonCategory(report.reason)] ||
                            reasonColors.OTHER
                          }
                        >
                          {getReasonCategory(report.reason)}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {report.content_type}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(report.created_at)}
                        </span>
                      </div>

                      {/* Reported User/Content */}
                      {report.content_type === "USER" && report.reported_user && (
                        <div className="flex items-center gap-2 mt-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={report.reported_user.image || undefined} />
                            <AvatarFallback>
                              {getInitials(report.reported_user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">
                              {report.reported_user.name || "Unknown User"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {report.reported_user.email}
                            </p>
                          </div>
                        </div>
                      )}

                      {report.content_preview && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          &quot;{report.content_preview}&quot;
                        </p>
                      )}

                      {/* Reporter Info */}
                      <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                        <span>Reported by:</span>
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={report.reporter.image || undefined} />
                          <AvatarFallback className="text-[10px]">
                            {getInitials(report.reporter.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span>{report.reporter.name || "Unknown"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {report.status === "PENDING" && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedReport(report);
                          setShowActionDialog(true);
                        }}
                      >
                        Review
                      </Button>
                    </div>
                  )}

                  {report.status !== "PENDING" && (
                    <Badge
                      variant={report.status === "RESOLVED" ? "default" : "secondary"}
                    >
                      {report.status}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Action Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Take Action on Report</DialogTitle>
            <DialogDescription>
              Choose how to handle this report. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium">Report Details</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Type: {selectedReport.content_type}
                </p>
                <p className="text-sm text-muted-foreground">
                  Reason: {selectedReport.reason}
                </p>
                {selectedReport.reported_user && (
                  <p className="text-sm text-muted-foreground">
                    User: {selectedReport.reported_user.name || selectedReport.reported_user.email}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleResolve("dismiss")}
                  disabled={isResolving}
                  className="flex items-center gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  Dismiss
                </Button>

                {selectedReport.content_type === "USER" && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => handleResolve("warn_user")}
                      disabled={isResolving}
                      className="flex items-center gap-2 text-yellow-600 hover:text-yellow-700"
                    >
                      <AlertTriangle className="h-4 w-4" />
                      Warn User
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleResolve("ban_user")}
                      disabled={isResolving}
                      className="flex items-center gap-2 col-span-2"
                    >
                      <Ban className="h-4 w-4" />
                      Ban User
                    </Button>
                  </>
                )}

                {selectedReport.content_type !== "USER" && (
                  <Button
                    variant="destructive"
                    onClick={() => handleResolve("delete_content")}
                    disabled={isResolving}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Content
                  </Button>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setShowActionDialog(false);
                setSelectedReport(null);
              }}
              disabled={isResolving}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
