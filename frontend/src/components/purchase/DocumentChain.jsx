import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export function DocumentChain({ links }) {
  const visible = links.filter((link) => link.id);
  if (visible.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {visible.map((link, index) => (
        <React.Fragment key={`${link.label}-${link.id}`}>
          {link.to ? (
            <Link
              to={link.to}
              title={link.label}
              className="rounded-full border border-[var(--line)] bg-slate-50 px-2.5 py-1 font-mono text-xs font-medium text-[var(--primary)] hover:bg-blue-50"
            >
              {link.id}
            </Link>
          ) : (
            <span title={link.label} className="rounded-full border border-[var(--line)] bg-slate-50 px-2.5 py-1 font-mono text-xs font-medium text-[var(--ink)]">
              {link.id}
            </span>
          )}
          {index < visible.length - 1 && <ArrowRight size={13} className="shrink-0 text-[var(--muted)]" />}
        </React.Fragment>
      ))}
    </div>
  );
}
