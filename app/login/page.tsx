"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AuthModal } from "@/components/auth-modal";

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const next = searchParams.get("next") ?? "/app";

  return (
    <AuthModal
      isOpen={true}
      onClose={() => {}}
      standalone={true}
      redirectTo={next}
      error={error}
    />
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
