import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Save, UserCog } from "lucide-react";
import { useAuth } from "../App.jsx";
import { useToast } from "../components/Toast.jsx";
import { Panel } from "../components/ui.jsx";

const jobTitles = ["Warehouse Manager", "Purchase Executive", "Sales Executive", "Production Supervisor", "Accountant", "Administrator", "Operations Manager"];
const departments = ["Operations", "Purchase", "Sales", "Manufacturing", "Finance", "Administration"];

export default function EditProfile() {
  const { session, updateProfile } = useAuth();
  const showToast = useToast();
  const user = session?.user || {};

  const [values, setValues] = useState({
    name: user.name || "",
    email: user.email || "",
    phone: user.phone || "",
    jobTitle: user.jobTitle || "",
    department: user.department || "",
  });

  const initials = (values.name || "U")
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  function setField(key, value) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!values.name.trim()) {
      showToast("Name is required.");
      return;
    }
    updateProfile(values);
    showToast("Profile updated.");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/dashboard" className="mb-4 flex items-center gap-1.5 text-sm font-medium text-[var(--muted)] hover:text-[var(--primary)]">
        <ArrowLeft size={15} />
        Back to Dashboard
      </Link>

      <Panel eyebrow="Account" title="Edit Profile" accent>
        <div className="mb-6 flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-xl font-semibold text-[var(--primary)]">{initials || <UserCog size={24} />}</span>
          <div>
            <p className="text-sm font-medium text-[var(--ink)]">{values.name || "Unnamed User"}</p>
            <p className="text-xs text-[var(--muted)]">{values.jobTitle || "No job title set"}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">Full Name *</label>
            <input
              type="text"
              value={values.name}
              onChange={(e) => setField("name", e.target.value)}
              required
              className="w-full rounded-md border border-[var(--line)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">Email</label>
            <input
              type="email"
              value={values.email}
              onChange={(e) => setField("email", e.target.value)}
              placeholder="you@company.com"
              className="w-full rounded-md border border-[var(--line)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">Phone</label>
            <input
              type="text"
              value={values.phone}
              onChange={(e) => setField("phone", e.target.value)}
              placeholder="+91 90000 00000"
              className="w-full rounded-md border border-[var(--line)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">Job Title</label>
            <select
              value={values.jobTitle}
              onChange={(e) => setField("jobTitle", e.target.value)}
              className="w-full rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Select job title...</option>
              {jobTitles.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">Department</label>
            <select
              value={values.department}
              onChange={(e) => setField("department", e.target.value)}
              className="w-full rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100 sm:max-w-xs"
            >
              <option value="">Select department...</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2 flex justify-end gap-2 border-t border-[var(--line)] pt-4">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-deep)]"
            >
              <Save size={15} />
              Save Changes
            </button>
          </div>
        </form>
      </Panel>
    </div>
  );
}
