"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { AuthModal } from "@/components/auth-modal";

interface AuthModalContextValue {
  isOpen: boolean;
  redirectTo: string;
  openAuthModal: (redirectTo?: string) => void;
  closeAuthModal: () => void;
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [redirectTo, setRedirectTo] = useState("/app");

  const openAuthModal = useCallback((to?: string) => {
    setRedirectTo(to ?? "/app");
    setIsOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <AuthModalContext.Provider value={{ isOpen, redirectTo, openAuthModal, closeAuthModal }}>
      {children}
      <AuthModal
        isOpen={isOpen}
        onClose={closeAuthModal}
        redirectTo={redirectTo}
      />
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const ctx = useContext(AuthModalContext);
  if (!ctx) throw new Error("useAuthModal must be used within AuthModalProvider");
  return ctx;
}
