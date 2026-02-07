"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Loader2,
  RefreshCw,
  AlertCircle,
  Activity,
  Database,
  Server,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { adminService } from "@/services/adminService";
import { SystemHealth } from "@/types/admin";

export default function HealthPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchHealth = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminService.getSystemHealth();
      setHealth(data);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load health data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const getStatusIcon = (status: "up" | "down" | "healthy" | "degraded" | "unhealthy") => {
    switch (status) {
      case "up":
      case "healthy":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "degraded":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "down":
      case "unhealthy":
        return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusBadge = (status: "up" | "down" | "healthy" | "degraded" | "unhealthy") => {
    switch (status) {
      case "up":
      case "healthy":
        return <Badge className="bg-green-500">Healthy</Badge>;
      case "degraded":
        return <Badge className="bg-yellow-500">Degraded</Badge>;
      case "down":
      case "unhealthy":
        return <Badge variant="destructive">Unhealthy</Badge>;
    }
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (error && !health) {
    return (
      <div className="p-8">
        <Card className="p-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
          <h2 className="text-lg font-medium">Error Loading Health Data</h2>
          <p className="text-muted-foreground mt-1">{error}</p>
          <Button onClick={fetchHealth} className="mt-4">
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
            <Activity className="h-8 w-8" />
            System Health
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time system monitoring and status
          </p>
        </div>
        <div className="flex items-center gap-4">
          {lastUpdate && (
            <p className="text-sm text-muted-foreground">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </p>
          )}
          <Button variant="outline" onClick={fetchHealth} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {isLoading && !health ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : health ? (
        <>
          {/* Overall Status */}
          <Card
            className={`border-2 ${
              health.status === "healthy"
                ? "border-green-200 dark:border-green-800"
                : health.status === "degraded"
                ? "border-yellow-200 dark:border-yellow-800"
                : "border-red-200 dark:border-red-800"
            }`}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {getStatusIcon(health.status)}
                  <div>
                    <h2 className="text-xl font-semibold">Overall System Status</h2>
                    <p className="text-muted-foreground">
                      All systems {health.status === "healthy" ? "operational" : "require attention"}
                    </p>
                  </div>
                </div>
                {getStatusBadge(health.status)}
              </div>
            </CardContent>
          </Card>

          {/* Services Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Database */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Database
                </CardTitle>
                {getStatusBadge(health.database.status)}
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Connections</span>
                    <span>
                      {health.database.connections} / {health.database.pool_size}
                    </span>
                  </div>
                  <Progress
                    value={
                      health.database.pool_size > 0
                        ? (health.database.connections / health.database.pool_size) * 100
                        : 0
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Cache Hit Ratio</p>
                    <p className="font-semibold text-lg">
                      {health.database.cache_hit_ratio}%
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Pool Size</p>
                    <p className="font-semibold text-lg">{health.database.pool_size}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Redis */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  Redis
                </CardTitle>
                {getStatusBadge(health.redis.status)}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Memory Used</p>
                    <p className="font-semibold text-lg">{health.redis.memory_used}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Ops/sec</p>
                    <p className="font-semibold text-lg">{health.redis.ops_per_sec}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Connected Clients</p>
                    <p className="font-semibold text-lg">
                      {health.redis.connected_clients}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Uptime</p>
                    <p className="font-semibold text-lg">
                      {formatUptime(health.uptime_seconds)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Errors (24h)
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div
                  className={`text-3xl font-bold ${
                    health.error_count_24h > 0 ? "text-orange-600" : "text-green-600"
                  }`}
                >
                  {health.error_count_24h}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Authentication failures
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  System Uptime
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {formatUptime(health.uptime_seconds)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Since last restart
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Auto-Refresh
                </CardTitle>
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">30s</div>
                <p className="text-xs text-muted-foreground mt-1">Refresh interval</p>
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
