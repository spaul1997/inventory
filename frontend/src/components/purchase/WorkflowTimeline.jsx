import React from "react";
import { Check } from "lucide-react";

const stepEventAliases = {
  Created: ["Draft"],
  "Submitted for Approval": ["Pending Approval"],
  "Submitted for Inspection": ["Pending Inspection"],
  "Sent to Supplier": ["Ordered"],
  "Stock Updated": ["Completed"],
  "Stock Deducted": ["Returned"],
};

function eventMatchesStep(event, step) {
  return event === step || stepEventAliases[step]?.includes(event);
}

function fallbackRecordActivity(step, record) {
  if (step === "Created" && (record.preparedBy || record.requestedBy || record.createdBy || record.date || record.createdDate || record.activity?.[0])) {
    const firstActivity = record.activity?.[0] || {};
    return {
      event: "Created",
      by: record.preparedBy || record.requestedBy || record.createdBy || firstActivity.by,
      date: record.createdDate || record.date || firstActivity.date,
      time: record.createdTime || firstActivity.time,
    };
  }
  if (step === "Rejected" && (record.rejectedBy || record.rejectionDate || record.rejectionReason)) {
    return { event: "Rejected", by: record.rejectedBy, date: record.rejectionDate, reason: record.rejectionReason };
  }
  if (step === "Approved" && (record.approvedBy || record.approvalDate)) {
    return { event: "Approved", by: record.approvedBy, date: record.approvalDate };
  }
  if (step === "Received" && (record.receivedBy || record.receivedDate)) {
    return { event: "Received", by: record.receivedBy, date: record.receivedDate };
  }
  return null;
}

function activityForStep(step, activity, record) {
  return [...activity].reverse().find((entry) => eventMatchesStep(entry.event, step)) || fallbackRecordActivity(step, record);
}

function formatActivityMeta(entry) {
  if (!entry) return "";
  return [entry.by, entry.date, entry.time].filter(Boolean).join(" - ");
}

export function WorkflowTimeline({ steps, activity = [], record = {} }) {
  let currentFound = false;

  return (
    <div className="workflow-timeline flex flex-wrap items-start gap-x-1 gap-y-3">
      {steps.map((step, index) => {
        const stepActivity = activityForStep(step, activity, record);
        const done = Boolean(stepActivity);
        const isCurrent = !done && !currentFound;
        const reason = stepActivity?.reason || (step === "Rejected" ? record.rejectionReason : "");
        if (isCurrent) currentFound = true;

        return (
          <React.Fragment key={step}>
            <div className="workflow-timeline-step flex max-w-[220px] items-start gap-1.5">
              <span
                className={`workflow-timeline-marker flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                  done ? "bg-emerald-500 text-white" : isCurrent ? "bg-[var(--primary)] text-white" : "bg-slate-200 text-slate-500"
                }`}
              >
                {done ? <Check size={12} /> : index + 1}
              </span>
              <span>
                <span className={`workflow-timeline-label block whitespace-nowrap text-xs font-medium ${done || isCurrent ? "text-[var(--ink)]" : "text-[var(--muted)]"}`}>
                  {step}
                </span>
                {stepActivity && (
                  <span className="workflow-timeline-meta mt-0.5 block text-[11px] leading-4 text-[var(--muted)]">
                    {formatActivityMeta(stepActivity)}
                    {reason && <span className="workflow-timeline-reason block break-words text-red-600">Reason: {reason}</span>}
                  </span>
                )}
              </span>
            </div>
            {index < steps.length - 1 && <span className={`workflow-timeline-line mt-3 h-px w-6 shrink-0 sm:w-10 ${done ? "bg-emerald-400" : "bg-slate-200"}`} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}
