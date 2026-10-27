"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";

type Mode = "login" | "register";

type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: "user" | "admin";
};

function safeNext(value: string) {
  return value.startsWith("/") && !value.startsWith("//") ? value : "";
}

export function AuthForm({ mode, nextPath = "" }: { mode: Mode; nextPath?: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isRegister = mode === "register";
  const destination = safeNext(nextPath);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (isRegister && password !== confirmPassword) {
      setError("The two passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isRegister ? { name, email, password } : { email, password }),
      });
      const data = (await response.json()) as { user?: AuthUser; error?: string };
      if (!response.ok || !data.user) throw new Error(data.error ?? "Something went wrong. Please try again.");

      const fallback = data.user.role === "admin" ? "/admin" : "/pharmacy";
      router.push(destination || fallback);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const alternateHref = isRegister
    ? `/login${destination ? `?next=${encodeURIComponent(destination)}` : ""}`
    : `/register${destination ? `?next=${encodeURIComponent(destination)}` : ""}`;

  return (
    <div className="auth-shell">
      <aside className="auth-brand-panel">
        <Link className="brand auth-brand" href="/">
          <span className="brand-mark"><Icon name="pin" size={21} /><span>+</span></span>
          <span className="brand-name">medfinder<span>.</span><small>ADDIS ABABA</small></span>
        </Link>
        <div className="auth-brand-copy">
          <span className="auth-eyebrow">{isRegister ? "JOIN THE PILOT" : "WELCOME BACK"}</span>
          <h1>{isRegister ? "Help neighbors find the medicine they need." : "A clearer view of medicine access."}</h1>
          <p>
            {isRegister
              ? "Create a free account, then register your pharmacy for verification by the MedFinder team."
              : "Sign in to manage your pharmacy inventory, review applications, or keep stock information fresh."}
          </p>
          <ul className="auth-benefits">
            <li><Icon name="shield" size={17} /><span>Admin-reviewed pharmacy profiles</span></li>
            <li><Icon name="clock" size={17} /><span>Stock freshness patients can trust</span></li>
            <li><Icon name="heart" size={17} /><span>Built for better access in Addis Ababa</span></li>
          </ul>
        </div>
        <p className="auth-brand-note">Sample inventory only. MedFinder does not provide medical advice.</p>
      </aside>

      <main className="auth-main">
        <div className="auth-card">
          <div className="auth-card-head">
            <span className="auth-card-icon"><Icon name={isRegister ? "user" : "lock"} size={20} /></span>
            <h2>{isRegister ? "Create your account" : "Sign in to MedFinder"}</h2>
            <p>{isRegister ? "A normal account can apply to become a pharmacy owner." : "Use the email and password linked to your account."}</p>
          </div>

          <form className="auth-form" onSubmit={submit}>
            {isRegister && (
              <label className="auth-field">
                <span>Full name</span>
                <span className="auth-input-wrap">
                  <Icon name="user" size={17} />
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Abebe Bekele"
                    autoComplete="name"
                    required
                    minLength={2}
                    maxLength={80}
                  />
                </span>
              </label>
            )}

            <label className="auth-field">
              <span>Email address</span>
              <span className="auth-input-wrap">
                <Icon name="mail" size={17} />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </span>
            </label>

            <label className="auth-field">
              <span>Password</span>
              <span className="auth-input-wrap">
                <Icon name="lock" size={17} />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={isRegister ? "At least 8 characters" : "Your password"}
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  required
                  minLength={isRegister ? 8 : undefined}
                  maxLength={128}
                />
              </span>
            </label>

            {isRegister && (
              <label className="auth-field">
                <span>Confirm password</span>
                <span className="auth-input-wrap">
                  <Icon name="lock" size={17} />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Repeat your password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    maxLength={128}
                  />
                </span>
              </label>
            )}

            {error && <div className="auth-error" role="alert"><Icon name="alert" size={16} />{error}</div>}

            <button className="auth-submit" type="submit" disabled={busy}>
              {busy ? <span className="button-spinner" /> : <Icon name={isRegister ? "user" : "arrow"} size={17} />}
              {busy ? "Please wait…" : isRegister ? "Create account" : "Sign in"}
            </button>
          </form>

          <p className="auth-switch">
            {isRegister ? "Already have an account?" : "New to MedFinder?"}{" "}
            <Link href={alternateHref}>{isRegister ? "Sign in" : "Create an account"}</Link>
          </p>

          {!isRegister && (
            <div className="auth-demo-hint">
              <strong>Demo administrator</strong>
              <span>admin@medfinder.local · Admin123!</span>
            </div>
          )}
        </div>

        <Link className="auth-back" href="/"><Icon name="arrow" size={15} /> Back to patient search</Link>
      </main>
    </div>
  );
}
