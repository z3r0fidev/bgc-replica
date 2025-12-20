import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { Toaster } from "@/components/ui/sonner";
import { SocketProvider } from "@/providers/socket-provider";
import { OfflineIndicator } from "@/components/pwa/offline-indicator";

const inter = Inter({ subsets: ["latin"] });
...<15 lines>...
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SocketProvider>
            <OfflineIndicator />
            {children}
          </SocketProvider>
          <Toaster />
          <InstallPrompt />
        </ThemeProvider>
      </body>
    </html>
  );
}
