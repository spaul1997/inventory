import React from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { Construction } from "lucide-react";
import { placeholderLookup } from "../data/menu.js";

export default function Placeholder() {
  const location = useLocation();
  const info = placeholderLookup.get(location.pathname);

  if (!info) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md rounded-md border border-[var(--line)] bg-white p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-blue-50 text-[var(--primary)]">
          <Construction size={22} />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">{info.section}</p>
        <h2 className="mt-1 text-xl font-semibold text-[var(--ink)]">{info.title}</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">This module is coming soon — we're actively building it out.</p>
        <Link
          to="/dashboard"
          className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-deep)]"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
