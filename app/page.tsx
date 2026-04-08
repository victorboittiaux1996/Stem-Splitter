"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Temporary: redirect to /app if logged in, /login if not.
// Will be replaced by the real landing page later.
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        router.replace("/app");
      } else {
        router.replace("/login");
      }
    });
  }, [router]);

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#111111",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <div style={{
        width: 24,
        height: 24,
        border: "2px solid #333",
        borderTopColor: "#1B10FD",
        borderRadius: "50%",
        animation: "spin 0.6s linear infinite",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
