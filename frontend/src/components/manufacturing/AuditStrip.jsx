import React from "react";
import { History } from "lucide-react";

function formatStamp(value) {
  if (!value) return null;
  return value.length > 10 ? value.replace("T", " ") : value;
}

/** Small audit-trail strip (created/updated by + when) shown on view/edit forms. */
export function AuditStrip({ record }) {
  if (!record?.createdBy && !record?.updatedBy) return null;
  const created = formatStamp(record.createdAt);
  const updated = formatStamp(record.updatedAt);

  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-[var(--muted)]">
      <History size={12} className="shrink-0" />
      {record.createdBy && (
        <span>
          Created by <span className="font-medium text-[var(--ink)]">{record.createdBy}</span>
          {created && <> on {created}</>}
        </span>
      )}
      {record.updatedBy && (
        <span>
          {record.createdBy && <span className="mx-1">·</span>}
          Last updated by <span className="font-medium text-[var(--ink)]">{record.updatedBy}</span>
          {updated && <> on {updated}</>}
        </span>
      )}
    </div>
  );
}
