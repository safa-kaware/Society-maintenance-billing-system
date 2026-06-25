import React, { useState, useEffect } from "react";
import ResidentPortal from "./components/ResidentPortal";
import AdminPortal from "./components/AdminPortal";
import { Flat, DBState } from "./types";
import { 
  Building2, 
  User, 
  ShieldAlert, 
  RefreshCw, 
  Layers, 
  Wifi, 
  Battery, 
  Signal, 
  Smartphone, 
  Languages, 
  HelpCircle,
  Database
} from "lucide-react";

export default function App() {
  const [currentTab, setCurrentTab] = useState<"resident" | "admin">("resident");
  const [dbState, setDbState] = useState<DBState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auth & Token states
  const [adminToken, setAdminToken] = useState<string | null>(() => localStorage.getItem("admin_token"));
  const [residentToken, setResidentToken] = useState<string | null>(() => localStorage.getItem("resident_token"));
  const [residentFlatId, setResidentFlatId] = useState<string | null>(() => localStorage.getItem("resident_flat_id"));
  const [publicFlats, setPublicFlats] = useState<Flat[]>([]);
  const [demoFlats, setDemoFlats] = useState<{ id: string; ownerName: string; contactNumber: string }[]>([]);
  const [adminPasscode, setAdminPasscode] = useState("");
  const [adminLoginError, setAdminLoginError] = useState<string | null>(null);
  const [isAdminLoggingIn, setIsAdminLoggingIn] = useState(false);

  // High-fidelity mobile clock state
  const [timeStr, setTimeStr] = useState("09:41 AM");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;
      setTimeStr(`${hours}:${minutes} ${ampm}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Secure API fetch helper headers
  const getAuthHeaders = () => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (currentTab === "admin") {
      if (adminToken) {
        headers["Authorization"] = `Bearer ${adminToken}`;
      }
    } else {
      if (residentToken) {
        headers["Authorization"] = `Bearer ${residentToken}`;
      }
    }
    return headers;
  };

  // Fetch all flats and metadata from backend securely
  const fetchFlats = async () => {
    try {
      // 1. Fetch public dropdown list of flats (safe: only IDs & owner names, no PII leak)
      const pubRes = await fetch("/api/public/flats");
      if (pubRes.ok) {
        const data = await pubRes.json();
        setPublicFlats(
          data.flats.map((f: any) => ({
            id: f.id,
            wing: f.id.split("-")[0],
            number: f.id.split("-")[1],
            ownerName: f.ownerName,
            contactNumber: "",
            email: "",
            amountDue: 0,
            status: "Unpaid",
            paymentHistory: [],
          }))
        );
      }

      // 2. Fetch public demo residents helper list
      const demoRes = await fetch("/api/public/demo");
      if (demoRes.ok) {
        const data = await demoRes.json();
        setDemoFlats(data.flats);
      }

      // 3. Perform authenticated data fetching
      if (currentTab === "admin") {
        if (!adminToken) {
          setIsLoading(false);
          return;
        }
        const response = await fetch("/api/flats", {
          headers: {
            "Authorization": `Bearer ${adminToken}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setDbState(data);
          setError(null);
        } else if (response.status === 403 || response.status === 401) {
          handleAdminLogout();
        } else {
          throw new Error("Failed to contact society server");
        }
      } else {
        // Resident Portal flow
        if (!residentToken || !residentFlatId) {
          setDbState({
            month: "June 2026",
            flats: [], // Empty state triggers login screen
          });
          setError(null);
          setIsLoading(false);
          return;
        }

        const response = await fetch(`/api/flats/${residentFlatId}`, {
          headers: {
            "Authorization": `Bearer ${residentToken}`,
          },
        });
        if (response.ok) {
          const flat = await response.json();
          const savedMonth = localStorage.getItem("saved_month") || "June 2026";
          const savedSettingsStr = localStorage.getItem("saved_settings");
          const adminSettings = savedSettingsStr ? JSON.parse(savedSettingsStr) : undefined;
          setDbState({
            month: savedMonth,
            flats: [flat],
            adminSettings,
          });
          setError(null);
        } else if (response.status === 403 || response.status === 401) {
          handleResidentLogout();
        } else {
          throw new Error("Failed to contact society server");
        }
      }
    } catch (err: any) {
      console.error(err);
      setError("Could not establish a secure connection to the billing server.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    fetchFlats();
  }, [currentTab, adminToken, residentToken, residentFlatId]);

  // Handle resident server authentication login
  const handleResidentLogin = async (flatId: string, contactNumber: string) => {
    const response = await fetch("/api/resident/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ flatId, contactNumber }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Login verification failed");
    }

    const data = await response.json();
    localStorage.setItem("resident_token", data.token);
    localStorage.setItem("resident_flat_id", data.flat.id);
    localStorage.setItem("saved_month", data.month);
    if (data.adminSettings) {
      localStorage.setItem("saved_settings", JSON.stringify(data.adminSettings));
    }

    setResidentToken(data.token);
    setResidentFlatId(data.flat.id);
    setDbState({
      month: data.month,
      flats: [data.flat],
      adminSettings: data.adminSettings,
    });
    return data.flat.id;
  };

  const handleResidentLogout = () => {
    localStorage.removeItem("resident_token");
    localStorage.removeItem("resident_flat_id");
    localStorage.removeItem("saved_month");
    localStorage.removeItem("saved_settings");
    setResidentToken(null);
    setResidentFlatId(null);
  };

  // Handle admin security passcode verification login
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPasscode) {
      setAdminLoginError("Security passcode is required.");
      return;
    }
    setIsAdminLoggingIn(true);
    setAdminLoginError(null);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: adminPasscode }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Invalid admin security passcode.");
      }
      const data = await response.json();
      localStorage.setItem("admin_token", data.token);
      setAdminToken(data.token);
      setDbState(data.state);
      setAdminPasscode("");
    } catch (err: any) {
      setAdminLoginError(err.message || "Passcode verification failed.");
    } finally {
      setIsAdminLoggingIn(false);
    }
  };

  const handleAdminLogout = () => {
    localStorage.removeItem("admin_token");
    setAdminToken(null);
  };

  // Handle a UPI Payment submission
  const handlePaymentSuccess = async (flatId: string, paymentDetails: any) => {
    try {
      const response = await fetch(`/api/flats/${flatId}/pay`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(paymentDetails),
      });

      if (!response.ok) {
        throw new Error("Payment submission failed on server");
      }

      await fetchFlats();
    } catch (err) {
      console.error("Error submitting payment", err);
      alert("Error logging payment. Please try again.");
    }
  };

  // Handle manual update or editing of flat details (Admin action)
  const handleUpdateStatus = async (flatId: string, updateData: any) => {
    try {
      const response = await fetch(`/api/flats/${flatId}/status`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error("Status update failed on server");
      }

      await fetchFlats();
    } catch (err) {
      console.error("Error updating status", err);
      alert("Failed to modify flat details. Please verify connections.");
    }
  };

  // Reset/seed database to default state
  const handleResetDB = async () => {
    if (!window.confirm("Are you sure you want to reset the housing society database to default simulation values? All custom payments made during this session will be overwritten.")) {
      return;
    }
    setIsResetting(true);
    try {
      const response = await fetch("/api/reset", {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error("Reset failed");
      }
      const data = await response.json();
      setDbState(data.state);
      setError(null);
    } catch (err) {
      console.error("Error resetting db", err);
      alert("Failed to reset database.");
    } finally {
      setIsResetting(false);
    }
  };

  // Update admin settings (WhatsApp, Bank details, UPI information)
  const handleUpdateSettings = async (settings: any) => {
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error("Settings update failed on server");
      }

      const data = await response.json();
      setDbState(data.state);
      return true;
    } catch (err) {
      console.error("Error updating settings", err);
      alert("Failed to save settings. Please verify server connection.");
      return false;
    }
  };

  // Clear database to 0 flats (start fresh)
  const handleClearDB = async () => {
    if (!window.confirm("Are you sure you want to clear all dummy resident data? This will empty your ledger so you can register your own building's wing and flat details.")) {
      return;
    }
    try {
      const response = await fetch("/api/clear", {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error("Clear failed");
      }
      const data = await response.json();
      setDbState(data.state);
      setError(null);
    } catch (err) {
      console.error("Error clearing db", err);
      alert("Failed to clear database.");
    }
  };

  // Add custom flat unit to society
  const handleAddFlat = async (flatData: any) => {
    try {
      const response = await fetch("/api/flats", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(flatData),
      });
      
      const data = await response.json();
      if (!response.ok) {
        alert(data.error || "Failed to register custom unit.");
        return false;
      }
      
      setDbState(data.state);
      setError(null);
      return true;
    } catch (err) {
      console.error("Error registering flat", err);
      alert("Connection failure while registering unit.");
      return false;
    }
  };

  // Delete a flat unit
  const handleDeleteFlat = async (flatId: string) => {
    try {
      const response = await fetch(`/api/flats/${flatId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error("Deletion failed");
      }
      const data = await response.json();
      setDbState(data.state);
      setError(null);
    } catch (err) {
      console.error("Error deleting flat", err);
      alert("Failed to delete flat unit.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center font-sans antialiased">
      <div className="w-full max-w-md min-h-screen bg-white shadow-2xl border-x border-slate-200/60 flex flex-col relative overflow-hidden animate-fade-in">
        
        {/* Compact Mobile App Header Bar */}
        <div className="bg-white border-b border-slate-100 px-4 py-3 flex justify-between items-center shrink-0 shadow-sm z-30">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 leading-tight">Kaveri Bldg</h3>
              <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest block font-mono">
                {dbState?.month || "Active Cycle"}
              </span>
            </div>
          </div>

          {/* Reset DB Button inside Mobile Screen for easy access */}
          <div className="flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <button
              onClick={handleResetDB}
              disabled={isResetting}
              className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg border border-slate-200 transition"
              title="Reset simulation database"
            >
              <RefreshCw className={`h-3 w-3 ${isResetting ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Mobile Screen Scroll Content Stage */}
        <div className="flex-1 overflow-y-auto bg-slate-50 relative pb-20">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 bg-slate-50 min-h-[400px]">
              <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin mb-3" />
              <p className="text-xs font-bold text-slate-700">Connecting to Society Billing Ledger...</p>
              <p className="text-[10px] text-slate-400 mt-1">Contacting local server endpoints</p>
            </div>
          ) : error ? (
            <div className="p-6 text-center bg-white border border-red-100 rounded-2xl shadow-sm m-4">
              <Layers className="h-10 w-10 text-red-500 mx-auto mb-3" />
              <p className="text-xs font-bold text-slate-800">Connection Failed</p>
              <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">{error}</p>
              <button
                onClick={() => {
                  setIsLoading(true);
                  fetchFlats();
                }}
                className="mt-4 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-bold transition"
              >
                Retry Connection
              </button>
            </div>
          ) : dbState ? (
            currentTab === "resident" ? (
              <ResidentPortal
                flats={residentToken ? dbState.flats : publicFlats}
                month={dbState.month}
                adminSettings={dbState.adminSettings}
                onRefresh={fetchFlats}
                onPaymentSuccess={handlePaymentSuccess}
                residentFlatId={residentFlatId}
                onResidentLogin={handleResidentLogin}
                onResidentLogout={handleResidentLogout}
                demoFlats={demoFlats}
              />
            ) : !adminToken ? (
              <div className="p-5 bg-white rounded-3xl shadow-sm border border-slate-200 m-4 animate-fade-in space-y-4">
                <div className="text-center space-y-1.5">
                  <div className="inline-flex p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-black text-slate-800 tracking-tight">Admin Passcode Lock</h3>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    This portal is cryptographically locked. Enter the master security password to audit ledgers and manage wings.
                  </p>
                </div>

                <form onSubmit={handleAdminLogin} className="space-y-3.5">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono">
                      Security Passcode
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••••••"
                      value={adminPasscode}
                      onChange={(e) => {
                        setAdminPasscode(e.target.value);
                        setAdminLoginError(null);
                      }}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs bg-slate-50/50 text-slate-800 tracking-widest font-black transition-all"
                      required
                      disabled={isAdminLoggingIn}
                    />
                  </div>

                  {adminLoginError && (
                    <div className="flex items-start space-x-1.5 text-red-600 text-[10px] font-bold bg-red-50 p-2.5 rounded-2xl border border-red-100">
                      <ShieldAlert className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span>{adminLoginError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isAdminLoggingIn}
                    className="w-full flex items-center justify-center space-x-1.5 px-4 py-3 bg-indigo-600 hover:bg-indigo-750 text-white rounded-2xl text-[11px] font-black transition duration-150 shadow-sm uppercase tracking-wider"
                  >
                    {isAdminLoggingIn ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <span>Authenticate & Unlock</span>
                    )}
                  </button>
                </form>

                <div className="bg-amber-50/80 border border-amber-100 rounded-2xl p-3 text-center">
                  <p className="text-[9px] text-amber-700 font-bold leading-normal">
                    🔑 Demo Security Note:<br />
                    The master passcode is <span className="underline select-all font-mono text-[10px]">KaveriAdmin2026</span>
                  </p>
                </div>
              </div>
            ) : (
              <AdminPortal
                flats={dbState.flats}
                month={dbState.month}
                adminSettings={dbState.adminSettings}
                onRefresh={fetchFlats}
                onUpdateStatus={handleUpdateStatus}
                onClearDB={handleClearDB}
                onAddFlat={handleAddFlat}
                onDeleteFlat={handleDeleteFlat}
                onUpdateSettings={handleUpdateSettings}
                onLogout={handleAdminLogout}
              />
            )
          ) : null}
        </div>

        {/* Persistent Mobile Bottom Navigation Bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200/85 h-16 px-6 flex justify-around items-center z-40 shadow-lg">
          <button
            onClick={() => setCurrentTab("resident")}
            className={`flex flex-col items-center justify-center space-y-1 py-1 w-20 transition duration-200 ${
              currentTab === "resident" 
                ? "text-indigo-600 font-bold scale-105" 
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <User className="h-4 w-4" />
            <span className="text-[10px] tracking-tight">My Flat</span>
          </button>

          <button
            onClick={() => setCurrentTab("admin")}
            className={`flex flex-col items-center justify-center space-y-1 py-1 w-20 transition duration-200 ${
              currentTab === "admin" 
                ? "text-indigo-600 font-bold scale-105" 
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <ShieldAlert className="h-4 w-4" />
            <span className="text-[10px] tracking-tight">Admin Portal</span>
          </button>
        </div>

      </div>
    </div>
  );
}
