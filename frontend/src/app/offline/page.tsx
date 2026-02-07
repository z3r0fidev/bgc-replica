"use client";

import { useEffect, useState } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    // If we're back online, redirect to home
    if (isOnline) {
      window.location.href = "/";
    }
  }, [isOnline]);

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <WifiOff className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">You&apos;re Offline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            It looks like you&apos;ve lost your internet connection. Some
            features may not be available.
          </p>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Things you can do:</p>
            <ul className="text-sm text-muted-foreground list-disc list-inside text-left">
              <li>Check your WiFi or mobile data</li>
              <li>Try moving to an area with better signal</li>
              <li>Wait and try again in a moment</li>
            </ul>
          </div>

          <Button onClick={handleRetry} className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>

          <p className="text-xs text-muted-foreground">
            BGCLive will automatically reconnect when you&apos;re back online.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
