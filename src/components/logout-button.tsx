"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";

export function LogoutButton({
  className = "",
  label = "Sign out",
  compact = false,
}: {
  className?: string;
  label?: string;
  compact?: boolean;
}) {
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/";
    }
  }

  return (
    <button
      type="button"
      className={className}
      onClick={signOut}
      disabled={busy}
      aria-label={label}
      title={label}
    >
      <Icon name="logout" size={15} />
      {!compact && <span>{busy ? "Signing out…" : label}</span>}
    </button>
  );
}
