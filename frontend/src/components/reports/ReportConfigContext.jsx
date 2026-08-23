import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { REPORT_KEYS } from "./reportShared.jsx";

// Session-only config for the Manufacturing & Sales Reports module: saved
// filter views, report schedules and a reporting-access matrix. Like every
// other module in this app, state is pure in-memory (no localStorage
// anywhere in the codebase) and resets on reload.
//
// Scheduling is UI-only: this application has no backend job scheduler,
// message queue, or email/notification service anywhere (100% frontend,
// in-memory demo data). This context only captures and stores the desired
// schedule configuration below — wiring it to a real dispatch mechanism
// (cron/queue + an email provider) is future backend work, not invented here.
//
// The access matrix is likewise a mock configuration surface: there is no
// role-based login anywhere in this app (Login accepts any credentials and
// only stores a typed name), so nothing here is read or enforced by any
// route guard — it only records intended per-role access for future wiring.

const ReportConfigContext = createContext(null);

const REPORT_KEY_LIST = REPORT_KEYS.map((r) => r.key);

const DEFAULT_ACCESS = {
  Admin: [...REPORT_KEY_LIST],
  "Production Manager": ["production-report", "material-consumption-report", "wip-report", "finished-goods-report"],
  "Sales Manager": ["sales-report", "dispatch-report", "sales-return-report"],
  Viewer: [...REPORT_KEY_LIST],
};

let idCounter = 0;
function nextId(prefix) {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

export function ReportConfigProvider({ children }) {
  const [savedViews, setSavedViews] = useState({});
  const [schedules, setSchedules] = useState([]);
  const [accessMatrix, setAccessMatrix] = useState(DEFAULT_ACCESS);

  const addSavedView = useCallback((reportKey, name, filters) => {
    setSavedViews((prev) => {
      const list = prev[reportKey] || [];
      return { ...prev, [reportKey]: [...list, { id: nextId("view"), name, filters, createdAt: new Date().toISOString() }] };
    });
  }, []);

  const removeSavedView = useCallback((reportKey, id) => {
    setSavedViews((prev) => ({ ...prev, [reportKey]: (prev[reportKey] || []).filter((v) => v.id !== id) }));
  }, []);

  const addSchedule = useCallback((schedule) => {
    setSchedules((prev) => [...prev, { id: nextId("sch"), active: true, createdAt: new Date().toISOString(), ...schedule }]);
  }, []);

  const toggleSchedule = useCallback((id) => {
    setSchedules((prev) => prev.map((s) => (s.id === id ? { ...s, active: !s.active } : s)));
  }, []);

  const removeSchedule = useCallback((id) => {
    setSchedules((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const toggleAccess = useCallback((role, reportKey) => {
    setAccessMatrix((prev) => {
      const list = prev[role] || [];
      const next = list.includes(reportKey) ? list.filter((k) => k !== reportKey) : [...list, reportKey];
      return { ...prev, [role]: next };
    });
  }, []);

  const value = useMemo(
    () => ({ savedViews, addSavedView, removeSavedView, schedules, addSchedule, toggleSchedule, removeSchedule, accessMatrix, toggleAccess }),
    [savedViews, addSavedView, removeSavedView, schedules, addSchedule, toggleSchedule, removeSchedule, accessMatrix, toggleAccess]
  );

  return <ReportConfigContext.Provider value={value}>{children}</ReportConfigContext.Provider>;
}

export function useReportConfig() {
  const ctx = useContext(ReportConfigContext);
  if (!ctx) throw new Error("useReportConfig must be used inside ReportConfigProvider");
  return ctx;
}
