import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { useToast } from "../components/Toast.jsx";
import { Panel } from "../components/ui.jsx";

const SETTINGS_KEY = "ims-settings";

const defaultSettings = {
  notifyLowStock: true,
  notifyOrderUpdates: true,
  notifySystemAnnouncements: false,
  notifyWeeklySummary: true,
  compactTables: false,
  defaultLandingPage: "/dashboard",
};

function loadSettings() {
  try {
    return { ...defaultSettings, ...JSON.parse(localStorage.getItem(SETTINGS_KEY)) };
  } catch {
    return defaultSettings;
  }
}

const landingPages = [
  { value: "/dashboard", label: "Dashboard" },
  { value: "/master-management", label: "Master Management" },
  { value: "/purchase-management", label: "Purchase Management" },
  { value: "/stock-management", label: "Stock Management" },
  { value: "/manufacturing", label: "Manufacturing" },
  { value: "/sales/customer-management", label: "Sales" },
  { value: "/inventory-reports", label: "Inventory Reports" },
];

function ToggleSwitch({ checked, onChange, label, sub }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-2.5">
      <div>
        <p className="text-sm font-medium text-[var(--ink)]">{label}</p>
        {sub && <p className="text-xs text-[var(--muted)]">{sub}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-[var(--primary)]" : "bg-slate-300"}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </label>
  );
}

export default function Settings() {
  const showToast = useToast();
  const [settings, setSettings] = useState(loadSettings);

  function setField(key, value) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    showToast("Settings saved.");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/dashboard" className="mb-4 flex items-center gap-1.5 text-sm font-medium text-[var(--muted)] hover:text-[var(--primary)]">
        <ArrowLeft size={15} />
        Back to Dashboard
      </Link>

      <div className="space-y-5">
        <Panel eyebrow="Preferences" title="Notifications" accent>
          <div className="divide-y divide-slate-100">
            <ToggleSwitch
              checked={settings.notifyLowStock}
              onChange={(v) => setField("notifyLowStock", v)}
              label="Low Stock Alerts"
              sub="Get notified when an item drops below its reorder level."
            />
            <ToggleSwitch
              checked={settings.notifyOrderUpdates}
              onChange={(v) => setField("notifyOrderUpdates", v)}
              label="Order Status Updates"
              sub="Purchase and sales order status changes."
            />
            <ToggleSwitch
              checked={settings.notifySystemAnnouncements}
              onChange={(v) => setField("notifySystemAnnouncements", v)}
              label="System Announcements"
              sub="Maintenance windows and product updates."
            />
            <ToggleSwitch
              checked={settings.notifyWeeklySummary}
              onChange={(v) => setField("notifyWeeklySummary", v)}
              label="Weekly Summary Email"
              sub="A digest of activity across all modules."
            />
          </div>
        </Panel>

        <Panel eyebrow="Preferences" title="Display" accent>
          <ToggleSwitch
            checked={settings.compactTables}
            onChange={(v) => setField("compactTables", v)}
            label="Compact Table Rows"
            sub="Show more rows per screen in list views."
          />
          <div className="border-t border-slate-100 pt-3">
            <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">Default Landing Page</label>
            <p className="mb-2 text-xs text-[var(--muted)]">Where you land right after signing in.</p>
            <select
              value={settings.defaultLandingPage}
              onChange={(e) => setField("defaultLandingPage", e.target.value)}
              className="w-full rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100 sm:max-w-xs"
            >
              {landingPages.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </Panel>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-deep)]"
          >
            <Save size={15} />
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
