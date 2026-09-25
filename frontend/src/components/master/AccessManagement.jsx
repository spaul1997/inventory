import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronRight,
  KeyRound,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  UserRoundCog,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "../../stores/AuthStore.jsx";
import { accessManagementService } from "../../services/accessManagementService.js";
import { useToast } from "../Toast.jsx";
import { Badge, Metric } from "../ui.jsx";

const emptyAccessData = {
  company: { businessName: "", maxUsers: 0, usedSeats: 0, availableSeats: 0 },
  users: [],
  roles: [],
  permissionOptions: [],
};

function formatDate(value) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function statusLabel(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function ModalFrame({ title, description, saving, onClose, onSubmit, submitLabel, children, error }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <form onSubmit={onSubmit} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-md border border-[var(--line)] bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-[var(--line)] bg-white px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-[var(--ink)]">{title}</h3>
            <p className="mt-1 text-xs text-[var(--muted)]">{description}</p>
          </div>
          <button type="button" disabled={saving} onClick={onClose} className="rounded-md p-2 text-[var(--muted)] hover:bg-slate-100 disabled:opacity-60" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4 p-5">
          {children}
          {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</div>}
        </div>
        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-[var(--line)] bg-white px-5 py-4">
          <button type="button" disabled={saving} onClick={onClose} className="rounded-md border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-slate-50 disabled:opacity-60">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-deep)] disabled:cursor-not-allowed disabled:opacity-60">
            {saving ? "Saving..." : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

function InputField({ label, required = false, ...props }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
        {label}{required && <span className="ml-0.5 text-[var(--danger)]">*</span>}
      </span>
      <input
        required={required}
        {...props}
        className="w-full rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--ink)] outline-none placeholder:text-slate-400 focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

function SelectField({ label, required = false, children, ...props }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
        {label}{required && <span className="ml-0.5 text-[var(--danger)]">*</span>}
      </span>
      <select
        required={required}
        {...props}
        className="w-full rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100"
      >
        {children}
      </select>
    </label>
  );
}

function UserModal({ user, roles, saving, error, onClose, onSave }) {
  const activeRoles = roles.filter((role) => role.status === "active" || role.id === user?.roleId);
  const [values, setValues] = useState(() => ({
    name: user?.name || "",
    email: user?.email || "",
    employeeCode: user?.employeeCode || "",
    phone: user?.phone || "",
    password: "",
    roleId: user?.roleId || activeRoles[0]?.id || "",
    status: user?.status || "active",
  }));

  function setField(key, value) {
    setValues((previous) => ({ ...previous, [key]: value }));
  }

  return (
    <ModalFrame
      title={user ? "Edit User" : "Add User"}
      description={user ? "Update account details, role, status, or password." : "Create a login account for this company."}
      saving={saving}
      error={error}
      onClose={onClose}
      onSubmit={(event) => {
        event.preventDefault();
        onSave(values);
      }}
      submitLabel={user ? "Update User" : "Create User"}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <InputField label="Full Name" required value={values.name} onChange={(event) => setField("name", event.target.value)} placeholder="User name" />
        <InputField label="Employee Code" required value={values.employeeCode} onChange={(event) => setField("employeeCode", event.target.value)} placeholder="e.g. EMP-001" />
        <InputField label="Email" required type="email" autoComplete="email" value={values.email} onChange={(event) => setField("email", event.target.value)} placeholder="user@example.com" />
        <InputField label="Phone" autoComplete="tel" value={values.phone} onChange={(event) => setField("phone", event.target.value)} placeholder="Optional" />
        <SelectField label="Role" required value={values.roleId} onChange={(event) => setField("roleId", event.target.value)}>
          <option value="">Select role...</option>
          {activeRoles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
        </SelectField>
        <SelectField label="Status" required value={values.status} onChange={(event) => setField("status", event.target.value)}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="blocked">Blocked</option>
        </SelectField>
        <div className="sm:col-span-2">
          <InputField
            label={user ? "New Password" : "Initial Password"}
            required={!user}
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={values.password}
            onChange={(event) => setField("password", event.target.value)}
            placeholder={user ? "Leave blank to keep the current password" : "Minimum 8 characters"}
          />
        </div>
      </div>
    </ModalFrame>
  );
}

function RoleModal({ role, permissionOptions, saving, error, onClose, onSave }) {
  const [values, setValues] = useState(() => ({
    name: role?.name || "",
    status: role?.status || "active",
    permissions: role?.permissions?.includes("*") ? permissionOptions.map((item) => item.key) : (role?.permissions || []),
  }));

  function togglePermission(permission, checked) {
    setValues((previous) => ({
      ...previous,
      permissions: checked
        ? [...new Set([...previous.permissions, permission])]
        : previous.permissions.filter((item) => item !== permission),
    }));
  }

  const allSelected = permissionOptions.length > 0 && permissionOptions.every((option) => values.permissions.includes(option.key));

  return (
    <ModalFrame
      title={role ? "Edit Role" : "Add Role"}
      description="Configure a company role and its application permissions."
      saving={saving}
      error={error}
      onClose={onClose}
      onSubmit={(event) => {
        event.preventDefault();
        onSave(values);
      }}
      submitLabel={role ? "Update Role" : "Create Role"}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <InputField label="Role Name" required value={values.name} onChange={(event) => setValues((previous) => ({ ...previous, name: event.target.value }))} placeholder="e.g. Purchase Manager" />
        <SelectField label="Status" required value={values.status} onChange={(event) => setValues((previous) => ({ ...previous, status: event.target.value }))}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </SelectField>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-[var(--ink)]">Permissions</h4>
            <p className="mt-0.5 text-xs text-[var(--muted)]">Choose which application areas this role can access.</p>
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-[var(--primary)]">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={(event) => setValues((previous) => ({
                ...previous,
                permissions: event.target.checked ? permissionOptions.map((item) => item.key) : [],
              }))}
              className="h-4 w-4 rounded border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]"
            />
            Select all
          </label>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {permissionOptions.map((permission) => (
            <label key={permission.key} className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 ${values.permissions.includes(permission.key) ? "border-blue-300 bg-blue-50" : "border-[var(--line)] hover:bg-slate-50"}`}>
              <input
                type="checkbox"
                checked={values.permissions.includes(permission.key)}
                onChange={(event) => togglePermission(permission.key, event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]"
              />
              <span>
                <span className="block text-sm font-semibold text-[var(--ink)]">{permission.label}</span>
                <span className="mt-0.5 block text-xs leading-4 text-[var(--muted)]">{permission.description}</span>
              </span>
            </label>
          ))}
        </div>
      </section>
    </ModalFrame>
  );
}

function PageIntro({ section, onAdd }) {
  const isUsers = section === "users";
  return (
    <>
      <p className="mb-2 flex items-center gap-1 text-xs text-[var(--muted)]">
        <Link to="/master-management" className="hover:text-[var(--primary)]">Master Setup</Link>
        <ChevronRight size={12} />
        <span className="text-[var(--ink)]">{isUsers ? "Users" : "Roles"}</span>
      </p>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[var(--ink)]">{isUsers ? "User Management" : "Role Management"}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {isUsers ? "Create company login accounts and assign access roles." : "Create roles and control application permissions."}
          </p>
        </div>
        <button type="button" onClick={onAdd} className="inline-flex items-center gap-2 rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-deep)]">
          <Plus size={16} /> Add {isUsers ? "User" : "Role"}
        </button>
      </div>
      <div className="mt-4 inline-flex rounded-md border border-[var(--line)] bg-white p-1">
        <Link to="/master-management/users" className={`rounded px-4 py-1.5 text-sm font-semibold ${isUsers ? "bg-blue-50 text-[var(--primary)]" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}>Users</Link>
        <Link to="/master-management/roles" className={`rounded px-4 py-1.5 text-sm font-semibold ${!isUsers ? "bg-blue-50 text-[var(--primary)]" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}>Roles</Link>
      </div>
    </>
  );
}

export function AccessManagement({ section }) {
  const { session } = useAuth();
  const showToast = useToast();
  const [data, setData] = useState(emptyAccessData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await accessManagementService.getAccessManagement(session?.token);
      setData({ ...emptyAccessData, ...result });
    } catch (requestError) {
      setError(requestError.message || "Unable to load users and roles.");
    } finally {
      setLoading(false);
    }
  }, [session?.token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setSearch("");
    setEditing(null);
    setModalOpen(false);
    setFormError("");
  }, [section]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return data.users;
    return data.users.filter((user) => [user.name, user.email, user.employeeCode, user.roleName, user.status].some((value) => String(value || "").toLowerCase().includes(query)));
  }, [data.users, search]);

  const filteredRoles = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return data.roles;
    return data.roles.filter((role) => [role.name, role.status, ...(role.permissions || [])].some((value) => String(value || "").toLowerCase().includes(query)));
  }, [data.roles, search]);

  function openCreate() {
    setEditing(null);
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(record) {
    setEditing(record);
    setFormError("");
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setEditing(null);
    setFormError("");
  }

  async function saveUser(values) {
    setSaving(true);
    setFormError("");
    try {
      if (editing) await accessManagementService.updateUser(editing.id, values, session?.token);
      else await accessManagementService.createUser(values, session?.token);
      await loadData();
      setModalOpen(false);
      setEditing(null);
      setFormError("");
      showToast(editing ? "User updated successfully." : "User created successfully.");
    } catch (requestError) {
      setFormError(requestError.message || "Unable to save user.");
    } finally {
      setSaving(false);
    }
  }

  async function saveRole(values) {
    setSaving(true);
    setFormError("");
    try {
      if (editing) await accessManagementService.updateRole(editing.id, values, session?.token);
      else await accessManagementService.createRole(values, session?.token);
      await loadData();
      setModalOpen(false);
      setEditing(null);
      setFormError("");
      showToast(editing ? "Role updated successfully." : "Role created successfully.");
    } catch (requestError) {
      setFormError(requestError.message || "Unable to save role.");
    } finally {
      setSaving(false);
    }
  }

  const isUsers = section === "users";
  const activeUsers = data.users.filter((user) => user.status === "active").length;
  const blockedUsers = data.users.filter((user) => user.status === "blocked").length;
  const activeRoles = data.roles.filter((role) => role.status === "active").length;

  return (
    <div>
      <PageIntro section={section} onAdd={openCreate} />

      {error && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          <span>{error}</span>
          <button type="button" onClick={loadData} className="inline-flex items-center gap-1.5 rounded border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold"><RefreshCw size={13} /> Retry</button>
        </div>
      )}

      {isUsers ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="User Seats" value={`${data.company.usedSeats}/${data.company.maxUsers}`} sub={data.company.businessName || "Company limit"} icon={Users} />
          <Metric label="Active Users" value={activeUsers} sub="Can sign in" icon={UserCheck} tone="accent" />
          <Metric label="Available Seats" value={data.company.availableSeats} sub="Before reaching the limit" icon={UserRoundCog} tone="warning" />
          <Metric label="Blocked Users" value={blockedUsers} sub="Access blocked" icon={KeyRound} tone="danger" />
        </div>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <Metric label="Total Roles" value={data.roles.length} sub="System and custom roles" icon={ShieldCheck} />
          <Metric label="Active Roles" value={activeRoles} sub="Available for assignment" icon={UserCheck} tone="accent" />
          <Metric label="Custom Roles" value={data.roles.filter((role) => !role.isSystemRole).length} sub="Company-defined roles" icon={UserRoundCog} tone="warning" />
        </div>
      )}

      <div className="mt-5 rounded-md border border-[var(--line)] bg-white">
        <div className="border-b border-[var(--line)] p-3">
          <div className="relative max-w-md">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={isUsers ? "Search users, employee code, or role..." : "Search roles or permissions..."}
              className="w-full rounded-md border border-[var(--line)] py-2 pl-9 pr-3 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {isUsers ? (
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-[var(--line)] text-xs uppercase text-[var(--muted)]">
                <tr><th className="px-4 py-3">User</th><th>Employee Code</th><th>Role</th><th>Status</th><th>Last Login</th><th className="px-4 text-right">Action</th></tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={6} className="px-4 py-10 text-center text-[var(--muted)]">Loading users...</td></tr>}
                {!loading && filteredUsers.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-[var(--muted)]">No users found.</td></tr>}
                {!loading && filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-3"><p className="font-semibold text-[var(--ink)]">{user.name}</p><p className="text-xs text-[var(--muted)]">{user.email}{user.phone ? ` · ${user.phone}` : ""}</p></td>
                    <td className="font-mono text-xs">{user.employeeCode}</td>
                    <td><span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} className="text-[var(--primary)]" />{user.roleName}</span></td>
                    <td><Badge>{statusLabel(user.status)}</Badge></td>
                    <td>{formatDate(user.lastLoginAt)}</td>
                    <td className="px-4 text-right"><button type="button" onClick={() => openEdit(user)} className="inline-flex items-center gap-1.5 rounded-md border border-[var(--line)] px-3 py-1.5 text-xs font-semibold hover:bg-blue-50 hover:text-[var(--primary)]"><Pencil size={13} /> Edit</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-[var(--line)] text-xs uppercase text-[var(--muted)]">
                <tr><th className="px-4 py-3">Role</th><th>Permissions</th><th>Assigned Users</th><th>Status</th><th className="px-4 text-right">Action</th></tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={5} className="px-4 py-10 text-center text-[var(--muted)]">Loading roles...</td></tr>}
                {!loading && filteredRoles.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-[var(--muted)]">No roles found.</td></tr>}
                {!loading && filteredRoles.map((role) => (
                  <tr key={role.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-3"><p className="font-semibold text-[var(--ink)]">{role.name}</p><p className="text-xs text-[var(--muted)]">{role.isSystemRole ? "Protected system role" : "Custom company role"}</p></td>
                    <td>{role.permissions.includes("*") ? "Full access" : `${role.permissions.length} permission${role.permissions.length === 1 ? "" : "s"}`}</td>
                    <td>{role.userCount}</td>
                    <td><Badge>{statusLabel(role.status)}</Badge></td>
                    <td className="px-4 text-right">
                      {role.isSystemRole ? <span className="text-xs font-medium text-[var(--muted)]">Protected</span> : (
                        <button type="button" onClick={() => openEdit(role)} className="inline-flex items-center gap-1.5 rounded-md border border-[var(--line)] px-3 py-1.5 text-xs font-semibold hover:bg-blue-50 hover:text-[var(--primary)]"><Pencil size={13} /> Edit</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modalOpen && isUsers && <UserModal key={editing?.id || "new-user"} user={editing} roles={data.roles} saving={saving} error={formError} onClose={closeModal} onSave={saveUser} />}
      {modalOpen && !isUsers && <RoleModal key={editing?.id || "new-role"} role={editing} permissionOptions={data.permissionOptions} saving={saving} error={formError} onClose={closeModal} onSave={saveRole} />}
    </div>
  );
}
