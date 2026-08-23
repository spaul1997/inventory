import React from "react";
import { Check } from "lucide-react";

export function WorkflowTimeline({ steps, activity = [] }) {
  const doneEvents = new Set(activity.map((a) => a.event));
  let currentFound = false;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {steps.map((step, index) => {
        const done = doneEvents.has(step);
        const isCurrent = !done && !currentFound;
        if (isCurrent) currentFound = true;

        return (
          <React.Fragment key={step}>
            <div className="flex items-center gap-1.5">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                  done ? "bg-emerald-500 text-white" : isCurrent ? "bg-[var(--primary)] text-white" : "bg-slate-200 text-slate-500"
                }`}
              >
                {done ? <Check size={12} /> : index + 1}
              </span>
              <span className={`whitespace-nowrap text-xs font-medium ${done || isCurrent ? "text-[var(--ink)]" : "text-[var(--muted)]"}`}>
                {step}
              </span>
            </div>
            {index < steps.length - 1 && <span className={`h-px w-6 shrink-0 sm:w-10 ${done ? "bg-emerald-400" : "bg-slate-200"}`} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}
