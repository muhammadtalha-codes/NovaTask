"use client";

import { useSession } from "next-auth/react";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { AppShell } from "@/components/app/AppShell";
import { Background3D } from "@/components/3d/Background3D";

export default function Home() {
  const { status } = useSession();

  if (status === "loading") {
    return (
      <div className="relative flex min-h-screen items-center justify-center">
        <Background3D />
        <div className="flex flex-col items-center gap-3">
          <div className="relative h-12 w-12">
            <div
              className="absolute inset-0 rounded-xl animate-pulse-glow"
              style={{
                background:
                  "linear-gradient(135deg, var(--brand), var(--brand-2))",
              }}
            />
          </div>
          <p className="text-sm text-muted-foreground">Loading NovaTask…</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <AuthScreen />;
  }

  return <AppShell />;
}
