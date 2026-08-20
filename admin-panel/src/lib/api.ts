import { firebaseAuth } from "./firebase";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";

function checkConfigured() {
  if (!API_BASE) {
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL is not set. Add it in your environment (.env.local locally, " +
        "or the Render service's Environment tab), then restart/redeploy."
    );
  }
}

async function authHeader(): Promise<Record<string, string>> {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error("Not signed in.");
  // NOT forcing a refresh here on purpose: the Firebase client SDK already
  // refreshes the token automatically in the background before it expires.
  // Forcing a refresh on every single call multiplies network round-trips
  // to Google's securetoken.googleapis.com, which is unnecessary load and
  // makes the app far more sensitive to any flakiness on that connection
  // (proxies/firewalls/extensions that interfere with it).
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

async function handle(res: Response, method: string, url: string) {
  if (!res.ok) {
    let message = `${method} ${url} → ${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body.error) {
        message = typeof body.error === "string" ? body.error : JSON.stringify(body.error);
      }
    } catch {
      // Response wasn't JSON (e.g. a plain host-not-found page) — the
      // message above already has the exact URL and status, which is
      // usually enough to spot a wrong NEXT_PUBLIC_API_BASE_URL at a glance.
    }

    // A 401 means the backend rejected the token. This is surfaced as a
    // normal error (shown on-screen) instead of silently signing the user
    // out — auto sign-out on every 401 was masking the real problem and
    // causing an immediate bounce back to /login on every navigation,
    // which made the underlying issue impossible to see or debug.
    throw new Error(message);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  async get(path: string) {
    checkConfigured();
    const headers = await authHeader();
    const url = `${API_BASE}${path}`;
    const res = await fetch(url, { headers, cache: "no-store" });
    return handle(res, "GET", url);
  },
  async post(path: string, body?: unknown) {
    checkConfigured();
    const headers = await authHeader();
    const url = `${API_BASE}${path}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    return handle(res, "POST", url);
  },
  async put(path: string, body?: unknown) {
    checkConfigured();
    const headers = await authHeader();
    const url = `${API_BASE}${path}`;
    const res = await fetch(url, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    return handle(res, "PUT", url);
  },
  async del(path: string) {
    checkConfigured();
    const headers = await authHeader();
    const url = `${API_BASE}${path}`;
    const res = await fetch(url, { method: "DELETE", headers });
    return handle(res, "DELETE", url);
  },
};

// Auth endpoints don't require an existing profile, so they skip authHeader()
// where relevant. registerProfile still needs the *fresh* ID token though.
export async function registerProfile(body: {
  name: string;
  lotName?: string;
  lotId?: string;
}) {
  checkConfigured();
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error("Not signed in.");
  const token = await user.getIdToken();
  const url = `${API_BASE}/api/auth/register-profile`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handle(res, "POST", url);
}