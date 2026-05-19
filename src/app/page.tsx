"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    } else if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  // Show loading while checking auth
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-950">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400" />
    </main>
  );
}
