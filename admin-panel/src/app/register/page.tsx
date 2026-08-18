"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";
import { registerProfile } from "@/lib/api";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [lotName, setLotName] = useState("");
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
      await createUserWithEmailAndPassword(firebaseAuth, email, password);
      // This account becomes the OWNER of a brand new lot (no lotId passed).
      await registerProfile({ name, lotName });
      router.push("/dashboard");
    } catch (err: any) {
      setError(
        err.code === "auth/email-already-in-use"
          ? "That email is already registered — try signing in instead."
          : err.code === "auth/weak-password"
          ? "Password should be at least 6 characters."
          : err.message
      );
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
          <h1 className="font-display text-2xl font-semibold text-white">Create your lot</h1>
          <p className="mt-1 text-sm text-white/50">
            This creates the owner account for a new parking lot
          </p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-card bg-graphite p-6 shadow-xl">
          {error && (
            <div className="mb-4 rounded-md bg-alert/15 px-3 py-2 text-sm text-alert">{error}</div>
          )}

          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/50">
            Your name
          </label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mb-4 w-full rounded-md border border-white/10 bg-night px-3 py-2 text-white outline-none focus:border-signal"
            placeholder="Jane Doe"
          />

          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/50">
            Parking lot name
          </label>
          <input
            required
            value={lotName}
            onChange={(e) => setLotName(e.target.value)}
            className="mb-4 w-full rounded-md border border-white/10 bg-night px-3 py-2 text-white outline-none focus:border-signal"
            placeholder="Downtown Parking"
          />

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
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mb-6 w-full rounded-md border border-white/10 bg-night px-3 py-2 text-white outline-none focus:border-signal"
            placeholder="At least 6 characters"
          />

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-signal py-2.5 font-semibold text-night transition hover:brightness-95 disabled:opacity-60"
          >
            {busy ? "Creating…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-white/50">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-signal">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
