"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signInWithEmailAndPassword(firebaseAuth, email, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.code === "auth/invalid-credential" ? "Wrong email or password." : err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-night px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-card bg-signal text-night font-display text-xl font-bold">
            P
          </div>
          <h1 className="font-display text-2xl font-semibold text-white">Parking Control</h1>
          <p className="mt-1 text-sm text-white/50">Sign in to manage your lot</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-card bg-graphite p-6 shadow-xl">
          {error && (
            <div className="mb-4 rounded-md bg-alert/15 px-3 py-2 text-sm text-alert">{error}</div>
          )}
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/50">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mb-4 w-full rounded-md border border-white/10 bg-night px-3 py-2 text-white outline-none focus:border-signal"
            placeholder="you@company.com"
          />
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/50">
            Password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mb-6 w-full rounded-md border border-white/10 bg-night px-3 py-2 text-white outline-none focus:border-signal"
            placeholder="••••••••"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-signal py-2.5 font-semibold text-night transition hover:brightness-95 disabled:opacity-60"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-white/50">
          New parking lot?{" "}
          <Link href="/register" className="font-medium text-signal">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
