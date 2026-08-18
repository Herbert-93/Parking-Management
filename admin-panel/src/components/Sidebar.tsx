"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";

const links = [
  { href: "/dashboard", label: "Overview", icon: "◈" },
  { href: "/dashboard/active", label: "Currently parked", icon: "🚗" },
  { href: "/dashboard/history", label: "History", icon: "☰" },
  { href: "/dashboard/rates", label: "Rate plans", icon: "$" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useAuth();

  async function handleSignOut() {
    await signOut(firebaseAuth);
    router.push("/login");
  }

  return (
    <aside className="flex h-screen w-60 flex-shrink-0 flex-col justify-between bg-night text-white">
      <div>
        <div className="flex items-center gap-2 px-5 py-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-signal text-night font-display text-sm font-bold">
            P
          </div>
          <span className="font-display text-lg font-semibold">Parking Control</span>
        </div>

        <nav className="mt-2 px-3">
          {links.map((link) => {
            const active =
              link.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`mb-1 flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition ${
                  active ? "bg-white/10 font-medium text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="w-4 text-center text-xs">{link.icon}</span>
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-white/10 px-5 py-4">
        <p className="truncate text-sm font-medium">{profile?.name || "—"}</p>
        <p className="mb-3 truncate text-xs text-white/40">{profile?.role === "owner" ? "Owner" : "Manager"}</p>
        {profile?.lotId && (
          <button
            onClick={() => navigator.clipboard.writeText(profile.lotId)}
            title="Click to copy — share this with managers so they can join your lot in the mobile app"
            className="mb-3 block w-full truncate rounded-md bg-white/5 px-2 py-1.5 text-left font-mono text-[11px] text-white/40 hover:text-white/70"
          >
            Lot ID: {profile.lotId}
          </button>
        )}
        <button
          onClick={handleSignOut}
          className="text-xs font-medium text-white/50 hover:text-alert"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
