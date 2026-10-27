"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { LogoutButton } from "@/components/logout-button";

type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: "user" | "admin";
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function AuthNav() {
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auth/me", { signal: controller.signal })
      .then((response) => response.json())
      .then((data: { user: AuthUser | null }) => setUser(data.user ?? null))
      .catch(() => {
        if (!controller.signal.aborted) setUser(null);
      });
    return () => controller.abort();
  }, []);

  if (user === undefined) return <span className="auth-nav-loading" aria-hidden="true" />;

  if (!user) {
    return (
      <div className="auth-nav">
        <Link className="auth-nav-link" href="/login">Sign in</Link>
        <Link className="auth-nav-register" href="/register?next=/pharmacy">Register</Link>
      </div>
    );
  }

  return (
    <div className="auth-nav">
      <Link
        className="auth-nav-account"
        href={user.role === "admin" ? "/admin" : "/pharmacy"}
        title={user.email}
      >
        <span className="auth-avatar">{initials(user.name)}</span>
        <span className="auth-nav-name">{user.name.split(" ")[0]}</span>
        {user.role === "admin" && <span className="auth-role-chip">Admin</span>}
      </Link>
      <LogoutButton className="auth-logout" compact />
    </div>
  );
}
