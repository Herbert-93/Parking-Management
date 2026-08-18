import { firebaseAuth } from "./firebase";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";

async function authHeader(): Promise<Record<string, string>> {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error("Not signed in.");
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

async function handle(res: Response) {
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body.error ? JSON.stringify(body.error) : message;
    } catch {
      /* ignore parse errors */
    }
    throw new Error(message);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  async get(path: string) {
    const headers = await authHeader();
    const res = await fetch(`${API_BASE}${path}`, { headers, cache: "no-store" });
    return handle(res);
  },
  async post(path: string, body?: unknown) {
    const headers = await authHeader();
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    return handle(res);
  },
  async put(path: string, body?: unknown) {
    const headers = await authHeader();
    const res = await fetch(`${API_BASE}${path}`, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    return handle(res);
  },
  async del(path: string) {
    const headers = await authHeader();
    const res = await fetch(`${API_BASE}${path}`, { method: "DELETE", headers });
    return handle(res);
  },
};

// Auth endpoints don't require an existing profile, so they skip authHeader()
// where relevant. registerProfile still needs the *fresh* ID token though.
export async function registerProfile(body: {
  name: string;
  lotName?: string;
  lotId?: string;
}) {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error("Not signed in.");
  const token = await user.getIdToken(true);
  const res = await fetch(`${API_BASE}/api/auth/register-profile`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handle(res);
}
