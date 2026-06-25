import React, { useState } from "react";
import {
  ShieldAlert,
  SlidersHorizontal,
  Download,
  Send,
  Edit2,
  Check,
  X,
  CreditCard,
  Users,
  TrendingUp,
  AlertTriangle,
  ExternalLink,
  Search,
  CheckCircle2,
  UserCheck,
  Languages,
  Copy,
  Plus,
  Trash2,
  LogOut
} from "lucide-react";
import { Flat, Payment, AdminSettings } from "../types";
import { downloadPDFReceipt, getWhatsAppShareUrl } from "../utils/pdfGenerator";
 
interface AdminPortalProps {
  flats: Flat[];
  month: string;
  adminSettings?: AdminSettings;
  onRefresh: () => void;
  onUpdateStatus: (
    flatId: string,
    updateData: {
      status: "Paid" | "Unpaid";
      method?: string;
      notes?: string;
      ownerName?: string;
      contactNumber?: string;
      email?: string;
    }
  ) => Promise<void>;
  onClearDB: () => Promise<void>;
  onAddFlat: (flatData: {
    wing: string;
    number: string;
    ownerName: string;
    contactNumber: string;
    email: string;
    amountDue: number;
  }) => Promise<boolean>;
  onDeleteFlat: (flatId: string) => Promise<void>;
  onUpdateSettings: (settings: AdminSettings) => Promise<boolean>;
  onLogout: () => void;
}
 
export default function AdminPortal({
  flats,
  month,
  adminSettings,
  onRefresh,
  onUpdateStatus,
  onClearDB,
  onAddFlat,
  onDeleteFlat,
  onUpdateSettings,
  onLogout,
}: AdminPortalProps) {
  // Filtering & Selection States
  const [filterWing, setFilterWing] = useState<string>("D");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [adminSearch, setAdminSearch] = useState<string>("");
  const [editingFlatId, setEditingFlatId] = useState<string | null>(null);
  const [bilingualNoticeFlatId, setBilingualNoticeFlatId] = useState<string | null>(null);
  const [copiedType, setCopiedType] = useState<"english" | "marathi" | "combined" | null>(null);

  // Form states for manual update / edit details
  const [editOwnerName, setEditOwnerName] = useState("");
  const [editContact, setEditContact] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editStatus, setEditStatus] = useState<"Paid" | "Unpaid">("Unpaid");
  const [editMethod, setEditMethod] = useState("Cash");
  const [editNotes, setEditNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states for registering a new custom flat
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addWing, setAddWing] = useState("D");
  const [addNumber, setAddNumber] = useState("");
  const [addOwnerName, setAddOwnerName] = useState("");
  const [addContact, setAddContact] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addAmount, setAddAmount] = useState<number>(2500);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);

  // Admin Settings states
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsUpiPayee, setSettingsUpiPayee] = useState(adminSettings?.upiPayee || "society@okbank");
  const [settingsUpiName, setSettingsUpiName] = useState(adminSettings?.upiName || "Heights CHS Maintenance Account");
  const [settingsBankName, setSettingsBankName] = useState(adminSettings?.bankName || "State Bank of India");
  const [settingsBankAccountNo, setSettingsBankAccountNo] = useState(adminSettings?.bankAccountNo || "38491029481");
  const [settingsBankIfsc, setSettingsBankIfsc] = useState(adminSettings?.bankIfsc || "SBIN0001234");
  const [settingsWhatsappNumber, setSettingsWhatsappNumber] = useState(adminSettings?.whatsappNumber || "9820001122");
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSuccessMsg, setSettingsSuccessMsg] = useState("");

  // Sync settings when adminSettings updates
  React.useEffect(() => {
    if (adminSettings) {
      setSettingsUpiPayee(adminSettings.upiPayee);
      setSettingsUpiName(adminSettings.upiName);
      setSettingsBankName(adminSettings.bankName);
      setSettingsBankAccountNo(adminSettings.bankAccountNo);
      setSettingsBankIfsc(adminSettings.bankIfsc);
      setSettingsWhatsappNumber(adminSettings.whatsappNumber);
    }
  }, [adminSettings]);

  // Handle saving the admin settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingsSuccessMsg("");
    try {
      const success = await onUpdateSettings({
        upiPayee: settingsUpiPayee,
        upiName: settingsUpiName,
        bankName: settingsBankName,
        bankAccountNo: settingsBankAccountNo,
        bankIfsc: settingsBankIfsc,
        whatsappNumber: settingsWhatsappNumber,
      });
      if (success) {
        setSettingsSuccessMsg("Settings updated successfully!");
        setTimeout(() => setSettingsSuccessMsg(""), 3000);
      }
    } catch (err) {
      console.error("Error saving admin settings", err);
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Export full ledger to CSV for auditing purposes
  const handleExportCSV = () => {
    const headers = [
      "Wing/Block",
      "Flat Number",
      "Resident Name",
      "Contact Number",
      "Email Address",
      "Monthly Dues (INR)",
      "Payment Status",
      "Last Payment Date",
      "Last Transaction ID",
      "Payment Mode"
    ];

    const rows = flats.map(flat => {
      const lastPayment = flat.paymentHistory && flat.paymentHistory.length > 0 
        ? flat.paymentHistory[flat.paymentHistory.length - 1] 
        : null;
      
      return [
        `"${flat.wing || ""}"`,
        `"${flat.number || ""}"`,
        `"${(flat.ownerName || "").replace(/"/g, '""')}"`,
        `"${flat.contactNumber || ""}"`,
        `"${(flat.email || "").replace(/"/g, '""')}"`,
        flat.amountDue,
        `"${flat.status || "Unpaid"}"`,
        lastPayment ? `"${lastPayment.date || ""}"` : '""',
        lastPayment ? `"${lastPayment.transactionId || ""}"` : '""',
        lastPayment ? `"${lastPayment.method || "UPI"}"` : '""'
      ];
    });

    const csvContent = "\ufeff" + [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `kaveri_bldg_maintenance_ledger_${month.toLowerCase().replace(/\s+/g, "_")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addWing || !addNumber || !addOwnerName || !addContact || !addEmail) {
      alert("Please fill in all required fields.");
      return;
    }

    setIsSubmittingAdd(true);
    try {
      const success = await onAddFlat({
        wing: addWing,
        number: addNumber,
        ownerName: addOwnerName,
        contactNumber: addContact,
        email: addEmail,
        amountDue: addAmount,
      });

      if (success) {
        // Reset form
        setAddWing("D");
        setAddNumber("");
        setAddOwnerName("");
        setAddContact("");
        setAddEmail("");
        setAddAmount(2500);
        setIsAddOpen(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  // Computed Notice Generator helper
  const getBilingualNotice = (flat: Flat) => {
    const isPaid = flat.status === "Paid";
    const lastPmt = flat.paymentHistory[flat.paymentHistory.length - 1];
    const txnId = lastPmt ? lastPmt.transactionId : "N/A";
    const amount = isPaid && lastPmt ? lastPmt.amount : flat.amountDue;
    const portalUrl = window.location.origin;

    let english = "";
    let marathi = "";

    if (isPaid) {
      english = `Dear ${flat.ownerName},\n\nThank you! Your maintenance payment of Rs. ${amount.toLocaleString("en-IN")} for ${month} has been successfully received & verified.\n\nTransaction Details:\n- Flat ID: ${flat.id}\n- Reference ID: ${txnId}\n- Status: PAID\n\nYou can access your invoice anytime via our digital portal: ${portalUrl}\n\nRegards,\nSociety Committee`;
      marathi = `प्रिय ${flat.ownerName},\n\nधन्यवाद! आपले ${month} महिन्याचे सोसायटी मेंटेनन्स ₹${amount.toLocaleString("en-IN")} यशस्वीरीत्या प्राप्त आणि सत्यापित झाले आहे.\n\nपेमेंट तपशील:\n- फ्लॅट क्रं: ${flat.id}\n- ट्रान्झॅक्शन आयडी: ${txnId}\n- स्थिती: भरले (PAID)\n\nआपण आपले डिजिटल पीडीएफ बिल सोसायटी पोर्टलवरून कधीही डाउनलोड करू शकता: ${portalUrl}\n\nसादर,\nव्यवस्थापन कमिटी`;
    } else {
      english = `Dear ${flat.ownerName},\n\nThis is a friendly reminder that your society maintenance dues of Rs. ${amount.toLocaleString("en-IN")} for ${month} are outstanding. Please pay your dues on the society portal or contact the committee office.\n\nPending Details:\n- Flat ID: ${flat.id}\n- Dues: Rs. ${amount.toLocaleString("en-IN")}\n- Status: UNPAID\n\nPay online instantly here: ${portalUrl}\n\nThank you,\nSociety Committee`;
      marathi = `प्रिय ${flat.ownerName},\n\nकृपया नोंद घ्या की आपले ${month} महिन्याचे सोसायटी मेंटेनन्स ₹${amount.toLocaleString("en-IN")} अद्याप प्रलंबित आहे. कृपया ऑनलाईन पोर्टलद्वारे किंवा सोसायटी कार्यालयात संपर्क साधून त्वरित मेंटेनन्स जमा करावा.\n\nप्रलंबित तपशील:\n- फ्लॅट क्रं: ${flat.id}\n- प्रलंबित रक्कम: ₹${amount.toLocaleString("en-IN")}\n- स्थिती: प्रलंबित (UNPAID)\n\nऑनलाइन पेमेंट करण्यासाठी लिंक: ${portalUrl}\n\nधन्यवाद,\nव्यवस्थापन कमिटी`;
    }

    const combined = `📢 *SOCIETY MAINTENANCE UPDATE / सोसायटी मेंटेनन्स संदेश* 📢\n\n${english}\n\n--------------------\n\n${marathi}`;

    return { english, marathi, combined };
  };

  const selectedNoticeFlat = flats.find((f) => f.id === bilingualNoticeFlatId);
  const activeNoticeText = selectedNoticeFlat ? getBilingualNotice(selectedNoticeFlat) : null;

  const handleCopyText = (text: string, type: "english" | "marathi" | "combined") => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const getWhatsAppUrl = (phone: string, text: string) => {
    const clean = phone.replace(/\D/g, "");
    const formatted = clean.length === 10 ? `91${clean}` : clean;
    return `https://api.whatsapp.com/send?phone=${formatted}&text=${encodeURIComponent(text)}`;
  };

  // Statistics Computations
  const totalUnits = flats.length;
  const paidFlats = flats.filter((f) => f.status === "Paid");
  const unpaidFlats = flats.filter((f) => f.status === "Unpaid");
  const paidCount = paidFlats.length;
  const unpaidCount = unpaidFlats.length;

  const totalCollected = paidFlats.reduce((acc, f) => {
    const lastPmt = f.paymentHistory[f.paymentHistory.length - 1];
    return acc + (lastPmt ? lastPmt.amount : f.amountDue);
  }, 0);

  const totalDuesExpected = flats.reduce((acc, f) => acc + f.amountDue, 0);
  const collectionPercentage = totalDuesExpected > 0 ? Math.round((totalCollected / totalDuesExpected) * 100) : 0;

  // Filter computation
  const filteredFlats = flats.filter((f) => {
    const matchesWing = filterWing === "All" || f.wing === filterWing;
    const matchesStatus = filterStatus === "All" || f.status === filterStatus;
    const matchesSearch =
      adminSearch.trim() === "" ||
      f.id.toLowerCase().includes(adminSearch.toLowerCase()) ||
      f.ownerName.toLowerCase().includes(adminSearch.toLowerCase()) ||
      f.number.includes(adminSearch);

    return matchesWing && matchesStatus && matchesSearch;
  });

  // Open Edit Dialog
  const handleOpenEdit = (flat: Flat) => {
    setEditingFlatId(flat.id);
    setEditOwnerName(flat.ownerName);
    setEditContact(flat.contactNumber);
    setEditEmail(flat.email);
    setEditStatus(flat.status);
    setEditMethod("Cash");
    setEditNotes("Cleared manually via Admin Panel.");
  };

  // Submit Edit / Manual status override
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFlatId) return;

    setIsSubmitting(true);
    try {
      await onUpdateStatus(editingFlatId, {
        status: editStatus,
        method: editStatus === "Paid" ? editMethod : undefined,
        notes: editStatus === "Paid" ? editNotes : undefined,
        ownerName: editOwnerName,
        contactNumber: editContact,
        email: editEmail,
      });
      setEditingFlatId(null);
      onRefresh();
    } catch (err) {
      console.error("Error updating flat details", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-3 py-4">
      {/* Intro Header */}
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black font-display text-slate-900 tracking-tight flex items-center space-x-2">
            <ShieldAlert className="h-5 w-5 text-indigo-600 shrink-0" />
            <span>Admin Command Panel</span>
          </h2>
          <p className="text-[11px] font-medium text-slate-500 mt-0.5 leading-relaxed">
            Audit collections, manually verify dues, and broadcast bilingual notices instantly on WhatsApp.
          </p>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-xl border border-slate-200 transition shrink-0"
          title="Sign out of Admin Session"
        >
          <LogOut className="h-3 w-3" />
          <span className="text-[10px] font-bold">Logout</span>
        </button>
      </div>

      {/* Database Quick Actions Bar */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => {
            setIsAddOpen(!isAddOpen);
            setIsSettingsOpen(false);
          }}
          className={`flex-1 flex items-center justify-center space-x-1.5 px-3 py-2.5 rounded-2xl text-xs font-bold transition duration-150 border shadow-sm ${
            isAddOpen 
              ? "bg-indigo-50 border-indigo-200 text-indigo-700" 
              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
          }`}
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Custom Unit</span>
        </button>

        <button
          onClick={() => {
            setIsSettingsOpen(!isSettingsOpen);
            setIsAddOpen(false);
          }}
          className={`flex-1 flex items-center justify-center space-x-1.5 px-3 py-2.5 rounded-2xl text-xs font-bold transition duration-150 border shadow-sm ${
            isSettingsOpen 
              ? "bg-indigo-50 border-indigo-200 text-indigo-700" 
              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
          }`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span>Billing Settings</span>
        </button>
      </div>

      {/* Collapsible Payment & Contact Settings Form */}
      {isSettingsOpen && (
        <form onSubmit={handleSaveSettings} className="bg-slate-50 border border-slate-200 rounded-3xl p-4 mb-5 shadow-inner space-y-3.5 animate-fade-in relative z-10">
          <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-display">
              ⚙️ Billing & Admin Settings
            </h4>
            <span className="text-[9px] font-mono font-bold text-slate-400">PERSISTENT DB</span>
          </div>

          <div className="space-y-2.5">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">
                Admin WhatsApp Number (for reminders/queries)
              </label>
              <input
                type="text"
                placeholder="e.g. 9820001122"
                value={settingsWhatsappNumber}
                onChange={(e) => setSettingsWhatsappNumber(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 font-mono"
                required
              />
            </div>

            <div className="border-t border-slate-200/60 pt-2">
              <span className="block text-[9px] font-bold text-indigo-600 mb-1.5 uppercase tracking-widest font-mono">
                UPI Gateway configuration
              </span>
              <div className="grid grid-cols-1 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">
                    UPI ID / Payee VPA
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. society@okbank"
                    value={settingsUpiPayee}
                    onChange={(e) => setSettingsUpiPayee(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">
                    UPI Payee Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Heights CHS Maintenance Account"
                    value={settingsUpiName}
                    onChange={(e) => setSettingsUpiName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200/60 pt-2">
              <span className="block text-[9px] font-bold text-indigo-600 mb-1.5 uppercase tracking-widest font-mono">
                Bank Deposit Details
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. State Bank of India"
                    value={settingsBankName}
                    onChange={(e) => setSettingsBankName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">
                    Account Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 38491029481"
                    value={settingsBankAccountNo}
                    onChange={(e) => setSettingsBankAccountNo(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">
                    Bank IFSC
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SBIN0001234"
                    value={settingsBankIfsc}
                    onChange={(e) => setSettingsBankIfsc(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 font-mono uppercase"
                  />
                </div>
              </div>
            </div>
          </div>

          {settingsSuccessMsg && (
            <p className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 border border-emerald-100 p-2 rounded-xl text-center animate-pulse">
              {settingsSuccessMsg}
            </p>
          )}

          <div className="flex space-x-2 pt-1">
            <button
              type="submit"
              disabled={isSavingSettings}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl text-xs font-bold transition duration-150 disabled:opacity-50 text-center"
            >
              {isSavingSettings ? "Saving Settings..." : "Save Configuration"}
            </button>
            <button
              type="button"
              onClick={() => setIsSettingsOpen(false)}
              className="px-4 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 rounded-xl text-xs font-semibold transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Collapsible Add Custom Unit Form */}
      {isAddOpen && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm mb-5 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center space-x-1.5">
              <Plus className="h-4 w-4 text-indigo-600 shrink-0" />
              <span>Register Custom Resident Unit</span>
            </h3>
            <button
              onClick={() => setIsAddOpen(false)}
              className="text-slate-400 hover:text-slate-650"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase font-mono block mb-1">Wing / Block *</label>
                <input
                  type="text"
                  value={addWing}
                  disabled
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 font-bold font-mono"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase font-mono block mb-1">Flat/Unit Number *</label>
                <input
                  type="text"
                  placeholder="e.g. 101"
                  value={addNumber}
                  onChange={(e) => setAddNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase font-mono block mb-1">Resident Full Name *</label>
              <input
                type="text"
                placeholder="e.g. Rajesh Sharma"
                value={addOwnerName}
                onChange={(e) => setAddOwnerName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase font-mono block mb-1">Contact Number (10 digit) *</label>
                <input
                  type="tel"
                  placeholder="e.g. 9820001122"
                  pattern="[0-9]{10}"
                  value={addContact}
                  onChange={(e) => setAddContact(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase font-mono block mb-1">Email Address *</label>
                <input
                  type="email"
                  placeholder="e.g. rajesh@example.com"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase font-mono block mb-1">Monthly Maintenance Dues (₹) *</label>
              <input
                type="number"
                value={addAmount}
                onChange={(e) => setAddAmount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 font-semibold"
                required
              />
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingAdd}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50"
              >
                {isSubmittingAdd ? "Registering..." : "Add Unit & Bill"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stats Board (2x2 Grid for Mobile-First Precision) */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {/* Total Collected */}
        <div className="bg-indigo-600 text-white rounded-2xl p-4 shadow-sm flex flex-col justify-between border border-indigo-700">
          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider block text-indigo-200 font-mono">Collected</span>
            <p className="text-xl font-black font-display tracking-tight mt-1">₹{totalCollected.toLocaleString()}</p>
          </div>
          <div className="text-[9px] mt-2 pt-2 border-t border-white/10 text-indigo-200 font-mono flex justify-between">
            <span>of ₹{totalDuesExpected.toLocaleString()}</span>
          </div>
        </div>

        {/* Collection Efficiency */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block font-mono">Efficiency</span>
            <p className="text-xl font-black text-slate-900 tracking-tight mt-1">{collectionPercentage}%</p>
          </div>
          <div className="mt-2.5">
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200/50">
              <div
                className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${collectionPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Paid Units */}
        <div className="bg-emerald-600 text-white rounded-2xl p-4 shadow-sm flex flex-col justify-between border border-emerald-700">
          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider block text-emerald-100 font-mono font-display">Paid Flats</span>
            <p className="text-xl font-black font-display tracking-tight mt-1">
              {paidCount} <span className="text-xs font-normal opacity-85">/ {totalUnits}</span>
            </p>
          </div>
          <div className="text-[9px] mt-2 pt-2 border-t border-emerald-500/30 text-emerald-100 font-mono">
            <span>Cleared Cycle</span>
          </div>
        </div>

        {/* Outstanding Dues */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block font-mono">Pending</span>
            <p className="text-xl font-black text-rose-500 tracking-tight mt-1">
              {unpaidCount} <span className="text-xs font-normal text-slate-400">flats</span>
            </p>
          </div>
          <div className="text-[9px] mt-2 pt-2 border-t border-slate-100 text-slate-500 font-mono flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
              ₹{(unpaidCount * 2500).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Table Control Card (Main Data Bento) */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden mb-12">
        {/* Filters Panel */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
            {/* Wing selector */}
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400 font-bold font-mono tracking-wider">WING:</span>
              <div className="flex bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 shadow-sm">
                D Wing Only
              </div>
            </div>

            {/* Status selector */}
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400 font-bold font-mono tracking-wider">STATUS:</span>
              <div className="flex bg-white border border-slate-200 rounded-xl p-0.5 text-xs shadow-sm">
                {["All", "Paid", "Unpaid"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all duration-200 ${
                      filterStatus === s
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Search inside Table and Export controls */}
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-center">
            <div className="relative w-full sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="h-4 w-4" />
              </div>
              <input
                type="text"
                placeholder="Search Owner or Flat..."
                value={adminSearch}
                onChange={(e) => setAdminSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white text-slate-800 shadow-sm"
              />
            </div>

            <button
              onClick={handleExportCSV}
              type="button"
              className="w-full sm:w-auto flex items-center justify-center space-x-1.5 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-800 rounded-xl text-xs font-bold transition duration-150 border border-indigo-150 shadow-sm shrink-0"
              title="Download full maintenance billing ledger as CSV"
            >
              <Download className="h-3.5 w-3.5 text-indigo-600" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Clean, Non-Congested Flats Card List */}
        <div className="p-4 space-y-3 bg-slate-50/40">
          {filteredFlats.length > 0 ? (
            filteredFlats.map((flat) => {
              const lastPayment = flat.paymentHistory[flat.paymentHistory.length - 1];
              return (
                <div key={flat.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-indigo-200 transition duration-150 space-y-3">
                  {/* Card Header: Flat & Status Badge */}
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-800 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-xl font-mono text-xs shadow-sm">
                      Flat {flat.id}
                    </span>
                    <span
                      className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                        flat.status === "Paid"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-150"
                          : "bg-rose-50 text-rose-700 border-rose-150"
                      }`}
                    >
                      <span className={`w-1 h-1 rounded-full ${flat.status === "Paid" ? "bg-emerald-500" : "bg-rose-500"}`} />
                      <span>{flat.status}</span>
                    </span>
                  </div>

                  {/* Card Body: Name, Contact, & Payment */}
                  <div className="text-xs space-y-2 text-slate-600">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-mono text-[9px] uppercase">Resident</span>
                      <strong className="text-slate-800 font-bold">{flat.ownerName}</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-mono text-[9px] uppercase">Contact</span>
                      <span className="font-medium text-slate-700">+91 {flat.contactNumber}</span>
                    </div>
                    {flat.status === "Paid" && lastPayment ? (
                      <div className="pt-2 border-t border-slate-100 mt-2 space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400 font-mono text-[9px] uppercase">Method</span>
                          <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-bold">
                            {lastPayment.method}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-slate-500">
                          <span className="text-slate-400 font-mono uppercase text-[9px]">Transaction ID</span>
                          <span className="font-mono text-slate-700 font-semibold">{lastPayment.transactionId}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center pt-2 border-t border-slate-100 mt-2 text-rose-600 font-bold text-[10px] uppercase">
                        <span>Balance Due</span>
                        <span>₹{flat.amountDue.toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Card Footer Actions */}
                  <div className="flex items-center justify-end gap-1.5 pt-2.5 border-t border-slate-100">
                    <button
                      onClick={() => setBilingualNoticeFlatId(flat.id)}
                      className="inline-flex p-1.5 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-800 rounded-lg border border-indigo-100 transition"
                      title="Generate Bilingual Notice"
                    >
                      <Languages className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => handleOpenEdit(flat)}
                      className="inline-flex p-1.5 text-slate-500 hover:bg-slate-50 hover:text-slate-800 rounded-lg border border-slate-200 transition"
                      title="Override details"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => onDeleteFlat(flat.id)}
                      className="inline-flex p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 rounded-lg border border-rose-100 transition"
                      title="Delete flat unit"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                    {flat.status === "Paid" && lastPayment ? (
                      <>
                        <button
                          onClick={() => downloadPDFReceipt(flat, lastPayment, month)}
                          className="inline-flex p-1.5 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-800 rounded-lg border border-emerald-100 transition"
                          title="Download PDF Receipt"
                        >
                          <Download className="h-4 w-4" />
                        </button>

                        <a
                          href={getWhatsAppShareUrl(flat, lastPayment, month)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex p-1.5 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-800 rounded-lg border border-emerald-100 transition"
                          title="Send on WhatsApp"
                        >
                          <Send className="h-4 w-4" />
                        </a>
                      </>
                    ) : (
                      <span className="text-[9px] font-bold text-rose-500 uppercase px-2 font-mono">
                        PENDING
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 px-6 text-center bg-white rounded-3xl border border-dashed border-slate-200 space-y-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full w-12 h-12 flex items-center justify-center mx-auto">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">No flats found</h4>
                <p className="text-[10px] text-slate-500 mt-1 max-w-xs mx-auto">
                  {flats.length === 0 
                    ? "Wipe the dummy data or click 'Add Custom Unit' above to start building your own society register."
                    : "No flats match your current active filters."}
                </p>
              </div>
              {flats.length === 0 && (
                <button
                  onClick={() => setIsAddOpen(true)}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-bold transition shadow-sm"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Register First Unit</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Manual log / Edit Modal overlay */}
      {editingFlatId && (
        <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-slate-950/80 transition-opacity backdrop-blur-sm"
              onClick={() => setEditingFlatId(null)}
            ></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

            <div className="relative z-10 inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full border border-slate-200">
              {/* Header */}
              <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white">
                <div className="flex items-center space-x-2">
                  <UserCheck className="h-5 w-5 text-emerald-400" />
                  <span className="font-extrabold text-sm uppercase">Manage Unit: {editingFlatId}</span>
                </div>
                <button
                  onClick={() => setEditingFlatId(null)}
                  className="text-slate-400 hover:text-white rounded-lg p-1 hover:bg-slate-800 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Edit Form */}
              <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
                {/* Section: Flat resident owner metadata */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5">
                    Resident Information
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Owner Name</label>
                      <input
                        type="text"
                        value={editOwnerName}
                        onChange={(e) => setEditOwnerName(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Mobile (India)</label>
                        <input
                          type="text"
                          value={editContact}
                          onChange={(e) => setEditContact(e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Email Address</label>
                        <input
                          type="email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section: Dues and status tracking */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5">
                    Billing & Clearance
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Payment Status</label>
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value as "Paid" | "Unpaid")}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 font-semibold"
                      >
                        <option value="Unpaid">Unpaid</option>
                        <option value="Paid">Mark as Paid</option>
                      </select>
                    </div>

                    {editStatus === "Paid" && (
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Receipt Method</label>
                        <select
                          value={editMethod}
                          onChange={(e) => setEditMethod(e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
                        >
                          <option value="Cash">Cash (Manual)</option>
                          <option value="Cheque">Cheque Deposit</option>
                          <option value="UPI">UPI Transfer</option>
                          <option value="Manual Verification">Direct Bank Transfer</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {editStatus === "Paid" && (
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Remarks / Audit Notes</label>
                      <textarea
                        rows={2}
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 leading-normal"
                        placeholder="e.g. Cleared via Cheque deposit #348210"
                      />
                    </div>
                  )}
                </div>

                {/* Footer Buttons */}
                <div className="pt-4 border-t border-slate-100 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setEditingFlatId(null)}
                    className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition disabled:opacity-50"
                  >
                    {isSubmitting ? "Updating..." : "Save Modifications"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Bilingual Message Notice Generator Modal */}
      {bilingualNoticeFlatId && selectedNoticeFlat && activeNoticeText && (
        <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-slate-950/80 transition-opacity backdrop-blur-sm"
              onClick={() => setBilingualNoticeFlatId(null)}
            ></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

            <div className="relative z-10 inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-xl sm:w-full border border-slate-200">
              {/* Header */}
              <div className="bg-indigo-900 px-6 py-4 flex items-center justify-between text-white font-display">
                <div className="flex items-center space-x-2">
                  <Languages className="h-5 w-5 text-indigo-350" />
                  <span className="font-extrabold text-sm uppercase">Bilingual Notice Generator (मराठी & English)</span>
                </div>
                <button
                  onClick={() => setBilingualNoticeFlatId(null)}
                  className="text-indigo-200 hover:text-white rounded-lg p-1 hover:bg-indigo-800 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Notice Content */}
              <div className="p-6 space-y-5 max-h-[65vh] overflow-y-auto">
                {/* Visual Status Tag */}
                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-500">Flat {selectedNoticeFlat.id} — {selectedNoticeFlat.ownerName}</span>
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                    selectedNoticeFlat.status === "Paid"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                      : "bg-red-50 text-red-700 border border-red-100"
                  }`}>
                    {selectedNoticeFlat.status}
                  </span>
                </div>

                {/* English Message Box */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">English Notice Template</span>
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => handleCopyText(activeNoticeText.english, "english")}
                        className="inline-flex items-center space-x-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 px-2 py-1 rounded-lg transition"
                      >
                        {copiedType === "english" ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                        <span>{copiedType === "english" ? "Copied!" : "Copy"}</span>
                      </button>
                      <a
                        href={getWhatsAppUrl(selectedNoticeFlat.contactNumber, activeNoticeText.english)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1.5 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-2 py-1 rounded-lg transition shadow-sm"
                      >
                        <Send className="h-3 w-3" />
                        <span>Send (English)</span>
                      </a>
                    </div>
                  </div>
                  <pre className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {activeNoticeText.english}
                  </pre>
                </div>

                {/* Marathi Message Box */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Marathi Notice Template (मराठी सूचना)</span>
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => handleCopyText(activeNoticeText.marathi, "marathi")}
                        className="inline-flex items-center space-x-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 px-2 py-1 rounded-lg transition"
                      >
                        {copiedType === "marathi" ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                        <span>{copiedType === "marathi" ? "Copied!" : "Copy"}</span>
                      </button>
                      <a
                        href={getWhatsAppUrl(selectedNoticeFlat.contactNumber, activeNoticeText.marathi)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1.5 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-2 py-1 rounded-lg transition shadow-sm"
                      >
                        <Send className="h-3 w-3" />
                        <span>मराठीत पाठवा (Marathi)</span>
                      </a>
                    </div>
                  </div>
                  <pre className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {activeNoticeText.marathi}
                  </pre>
                </div>

                {/* Combined Message Box (Perfect for Society WhatsApp Broadcast) */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Combined Bilingual Message (WhatsApp BroadCast)</span>
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => handleCopyText(activeNoticeText.combined, "combined")}
                        className="inline-flex items-center space-x-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 px-2 py-1 rounded-lg transition"
                      >
                        {copiedType === "combined" ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                        <span>{copiedType === "combined" ? "Copied!" : "Copy"}</span>
                      </button>
                      <a
                        href={getWhatsAppUrl(selectedNoticeFlat.contactNumber, activeNoticeText.combined)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1.5 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-2 py-1 rounded-lg transition shadow-sm"
                      >
                        <Send className="h-3 w-3" />
                        <span>Send Combined</span>
                      </a>
                    </div>
                  </div>
                  <pre className="p-3 bg-slate-50 border border-indigo-50 rounded-xl text-xs font-mono text-slate-700 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                    {activeNoticeText.combined}
                  </pre>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-4 px-6 pb-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3">
                <a
                  href={getWhatsAppUrl(selectedNoticeFlat.contactNumber, activeNoticeText.combined)}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition shadow-md shadow-emerald-600/10"
                >
                  <Send className="h-4 w-4" />
                  <span>Send Bilingual Notice via WhatsApp</span>
                </a>
                
                <button
                  type="button"
                  onClick={() => setBilingualNoticeFlatId(null)}
                  className="w-full sm:w-auto px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-50 text-center"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
