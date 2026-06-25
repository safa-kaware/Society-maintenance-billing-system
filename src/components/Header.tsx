import React from "react";
import { Building2, User, ShieldAlert, RefreshCw } from "lucide-react";

interface HeaderProps {
  currentTab: "resident" | "admin";
  onTabChange: (tab: "resident" | "admin") => void;
  month: string;
  onResetDB: () => void;
  isResetting: boolean;
}

export default function Header({
  currentTab,
  onTabChange,
  month,
  onResetDB,
  isResetting,
}: HeaderProps) {
  return (
    <header className="bg-slate-50 text-slate-900 pt-6 pb-2 border-b border-slate-200/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Logo Section */}
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
              <Building2 className="h-6 w-6" id="logo-icon" />
            </div>
            <div>
              <h1 className="text-2xl font-black font-display text-slate-900 tracking-tight leading-tight">
                Kaveri <span className="text-indigo-600">Bldg</span>
              </h1>
              <p className="text-xs font-medium text-slate-500">
                Kaveri Housing Society Ltd. — Automated Billing & Collection
              </p>
            </div>
          </div>

          {/* Right Action Controls / Tabs / Metrics */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Active Cycle Pill */}
            <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-semibold text-slate-700">
                Billing Cycle: <strong className="text-indigo-600">{month}</strong>
              </span>
            </div>

            {/* Custom Interactive Tab Bar */}
            <div className="flex p-1 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <button
                id="resident-tab-btn"
                onClick={() => onTabChange("resident")}
                className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${
                  currentTab === "resident"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <User className="h-3.5 w-3.5" />
                <span>Resident Portal</span>
              </button>
              <button
                id="admin-tab-btn"
                onClick={() => onTabChange("admin")}
                className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${
                  currentTab === "admin"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <ShieldAlert className="h-3.5 w-3.5" />
                <span>Admin Command</span>
              </button>
            </div>

            {/* Reset Button */}
            <button
              onClick={onResetDB}
              disabled={isResetting}
              className="p-2.5 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-900 rounded-2xl border border-slate-200 shadow-sm transition duration-150 disabled:opacity-50"
              title="Reset Database to Default Demo State"
            >
              <RefreshCw className={`h-4 w-4 ${isResetting ? "animate-spin text-indigo-500" : ""}`} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
