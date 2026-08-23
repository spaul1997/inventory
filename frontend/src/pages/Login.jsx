import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  Eye,
  EyeOff,
  KeyRound,
  Layers,
  Lock,
  LogIn,
  PackageCheck,
  PackagePlus,
  ScanBarcode,
  ShieldCheck,
  TrendingUp,
  Truck,
  Warehouse,
} from "lucide-react";
import { useAuth } from "../App.jsx";

const highlights = [
  { icon: PackageCheck, text: "Real-time stock across every store" },
  { icon: TrendingUp, text: "Purchase & sales trends at a glance" },
  { icon: ShieldCheck, text: "Role-based access for your team" },
];

const bgIcons = [
  { icon: Boxes, top: "4%", left: "6%", size: 52, rotate: -12 },
  { icon: Warehouse, top: "10%", left: "88%", size: 70, rotate: 8 },
  { icon: PackageCheck, top: "18%", left: "26%", size: 40, rotate: 15 },
  { icon: Truck, top: "8%", left: "46%", size: 44, rotate: -6 },
  { icon: ClipboardList, top: "22%", left: "64%", size: 38, rotate: 10 },
  { icon: ScanBarcode, top: "4%", left: "68%", size: 34, rotate: -14 },
  { icon: Layers, top: "30%", left: "4%", size: 46, rotate: 6 },
  { icon: BarChart3, top: "34%", left: "92%", size: 42, rotate: -8 },
  { icon: PackagePlus, top: "46%", left: "16%", size: 36, rotate: 18 },
  { icon: Boxes, top: "50%", left: "80%", size: 48, rotate: 20 },
  { icon: Warehouse, top: "64%", left: "36%", size: 56, rotate: -10 },
  { icon: Truck, top: "58%", left: "6%", size: 40, rotate: 12 },
  { icon: ScanBarcode, top: "70%", left: "90%", size: 44, rotate: -18 },
  { icon: ClipboardList, top: "80%", left: "14%", size: 40, rotate: 8 },
  { icon: PackageCheck, top: "86%", left: "70%", size: 50, rotate: -14 },
  { icon: Layers, top: "90%", left: "44%", size: 34, rotate: 10 },
  { icon: BarChart3, top: "76%", left: "54%", size: 36, rotate: -6 },
  { icon: PackagePlus, top: "92%", left: "92%", size: 42, rotate: 16 },
];

function IconPattern() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      {bgIcons.map(({ icon: Icon, top, left, size, rotate }, index) => (
        <Icon
          key={index}
          size={size}
          style={{ top, left, transform: `rotate(${rotate}deg)` }}
          className="absolute text-[var(--primary)] opacity-[0.08]"
        />
      ))}
    </div>
  );
}

export default function Login() {
  const { login, session } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTo = location.state?.from?.pathname || "/dashboard";

  useEffect(() => {
    if (session?.token) {
      navigate(redirectTo, { replace: true });
    }
  }, [navigate, redirectTo, session?.token]);

  function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!loginId.trim() || !password) {
      setError("Employee code, email, or mobile and password are required.");
      return;
    }

    setIsSubmitting(true);

    login(
      {
        token: `demo-${Date.now()}`,
        user: { name: loginId.trim() },
      },
      remember
    );
    navigate(redirectTo, { replace: true });
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--bg)] px-4 py-10">
      <IconPattern />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.10),transparent_35%),radial-gradient(circle_at_80%_75%,rgba(15,42,67,0.08),transparent_35%)]" />

      <div className="relative grid w-full max-w-4xl overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-xl md:grid-cols-2">
        <div className="relative hidden flex-col justify-between bg-gradient-to-br from-[var(--primary)] to-[var(--primary-deep)] p-8 text-white md:flex">
          <div className="relative z-10">
            <div className="mb-8 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-white/15">
                <Boxes size={20} />
              </div>
              <span className="text-sm font-semibold uppercase tracking-wide text-blue-100">
                Inventory Management System
              </span>
            </div>
            <h1 className="text-2xl font-semibold leading-snug">
              Welcome back to your IMS Control Center
            </h1>
            <p className="mt-3 text-sm text-blue-100">
              Sign in to track stock, purchases, and sales across all your stores in one place.
            </p>
          </div>
          <ul className="relative z-10 space-y-4">
            {highlights.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-blue-50">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/15">
                  <Icon size={16} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <div className="p-8 sm:p-10">
          <div className="mb-8 md:hidden">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-blue-50 text-[var(--primary)]">
              <Boxes size={20} />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Inventory Management System
            </p>
          </div>

          <h2 className="text-xl font-semibold text-[var(--ink)]">Sign in to your account</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Enter your credentials to continue.</p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="loginId" className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
                Employee code, email, or mobile
              </label>
              <div className="relative">
                <KeyRound size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                <input
                  id="loginId"
                  type="text"
                  autoComplete="username"
                  placeholder="EMP001, you@company.com, or mobile number"
                  value={loginId}
                  onChange={(event) => setLoginId(event.target.value)}
                  className="w-full rounded-md border border-[var(--line)] bg-white py-2.5 pl-9 pr-3 text-sm text-[var(--ink)] outline-none placeholder:text-slate-400 focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-md border border-[var(--line)] bg-white py-2.5 pl-9 pr-10 text-sm text-[var(--ink)] outline-none placeholder:text-slate-400 focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--ink)]"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                  className="h-4 w-4 rounded border-[var(--line)] text-[var(--primary)] focus:ring-[var(--primary)]"
                />
                Keep me signed in
              </label>
              <a href="#" className="text-sm font-medium text-[var(--primary)] hover:text-[var(--primary-deep)]">
                Forgot password?
              </a>
            </div>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-[var(--primary)] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--primary-deep)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? (
                "Signing in..."
              ) : (
                <>
                  <LogIn size={16} />
                  Sign In
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
