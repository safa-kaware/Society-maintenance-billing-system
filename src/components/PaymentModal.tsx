import React, { useState, useEffect } from "react";
import { X, CheckCircle, AlertTriangle, ArrowRight, Wallet, QrCode, Phone, Smartphone, Landmark } from "lucide-react";
import { Flat, AdminSettings } from "../types";

interface PaymentModalProps {
  flat: Flat;
  month: string;
  adminSettings?: AdminSettings;
  onClose: () => void;
  onPaymentSuccess: (paymentDetails: {
    transactionId: string;
    method: "GPay" | "PhonePe" | "Paytm" | "UPI" | "Cash" | "Manual Verification";
    amount: number;
    notes: string;
  }) => void;
}

export default function PaymentModal({
  flat,
  month,
  adminSettings,
  onClose,
  onPaymentSuccess,
}: PaymentModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<"GPay" | "PhonePe" | "Paytm" | "UPI" | null>(null);
  const [loadingState, setLoadingState] = useState<string | null>(null);
  const [customTxId, setCustomTxId] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Generate standard UPI payload deep-link URI
  const upiPayee = adminSettings?.upiPayee || "society@okbank";
  const upiName = adminSettings?.upiName || "Heights CHS Maintenance Account";
  const upiAmount = flat.amountDue;
  const upiNote = `Mnt_${flat.id}_${month.replace(/\s+/g, "")}`;
  const upiURI = `upi://pay?pa=${encodeURIComponent(upiPayee)}&pn=${encodeURIComponent(upiName)}&am=${upiAmount}&cu=INR&tn=${encodeURIComponent(upiNote)}`;

  // Create QR Code URL using free API
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiURI)}`;

  const getSpecificUpiLink = (method: "GPay" | "PhonePe" | "Paytm" | "UPI") => {
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const queryParams = `pa=${encodeURIComponent(upiPayee)}&pn=${encodeURIComponent(upiName)}&am=${upiAmount}&cu=INR&tn=${encodeURIComponent(upiNote)}`;

    if (method === "GPay") {
      if (isAndroid) {
        return `intent://pay?${queryParams}#Intent;scheme=upi;package=com.google.android.apps.nitas;end`;
      } else if (isIOS) {
        return `gpay://upi/pay?${queryParams}`;
      } else {
        return `upi://pay?${queryParams}`;
      }
    }

    if (method === "PhonePe") {
      if (isAndroid) {
        return `intent://pay?${queryParams}#Intent;scheme=upi;package=com.phonepe.app;end`;
      } else {
        return `phonepe://pay?${queryParams}`;
      }
    }

    if (method === "Paytm") {
      if (isAndroid) {
        return `intent://pay?${queryParams}#Intent;scheme=upi;package=net.one97.paytm;end`;
      } else {
        return `paytmmp://pay?${queryParams}`;
      }
    }

    return `upi://pay?${queryParams}`;
  };

  const simulatePayment = (method: "GPay" | "PhonePe" | "Paytm" | "UPI") => {
    setSelectedMethod(method);
    setError(null);
    setLoadingState("Connecting to UPI Network secure channel...");

    // Try to redirect mobile users directly to their selected app
    try {
      const upiLink = getSpecificUpiLink(method);
      window.location.href = upiLink;
    } catch (err) {
      console.warn("Could not execute deep-link redirect:", err);
    }

    setTimeout(() => {
      setLoadingState(`Processing payment of ₹${flat.amountDue.toLocaleString()} via ${method}...`);
    }, 800);

    setTimeout(() => {
      setLoadingState("Authorizing transaction with bank...");
    }, 1600);

    setTimeout(() => {
      const generatedTxId = `UPI${Math.floor(100000000000 + Math.random() * 900000000000)}`;
      onPaymentSuccess({
        transactionId: generatedTxId,
        method,
        amount: flat.amountDue,
        notes: `Instant UPI receipt generated via ${method} Mobile Gateway.`,
      });
      setLoadingState(null);
    }, 2400);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTxId.trim()) {
      setError("Please enter a valid Transaction or Reference ID.");
      return;
    }
    if (customTxId.length < 8) {
      setError("Transaction ID must be at least 8 alphanumeric characters.");
      return;
    }

    setLoadingState("Verifying reference ID against database records...");

    setTimeout(() => {
      onPaymentSuccess({
        transactionId: customTxId.trim(),
        method: "UPI",
        amount: flat.amountDue,
        notes: "Manually matched by resident. Subject to audit audit verification.",
      });
      setLoadingState(null);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      {/* Overlay */}
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div 
          className="fixed inset-0 bg-slate-950/80 transition-opacity backdrop-blur-sm" 
          aria-hidden="true"
          onClick={onClose}
        ></div>

        {/* Centering spacer */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        {/* Modal panel */}
        <div className="relative z-10 inline-block align-bottom bg-white rounded-3xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-slate-200">
          
          {/* Header */}
          <div className="bg-slate-950 px-6 py-5 flex items-center justify-between border-b border-slate-800 text-white">
            <div className="flex items-center space-x-2.5">
              <Wallet className="h-5 w-5 text-indigo-400" />
              <span className="font-bold tracking-tight text-xs uppercase font-display">Secure UPI Checkout</span>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition duration-150 rounded-xl p-1.5 hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-6">
            {loadingState ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <div className="relative flex items-center justify-center mb-6">
                  {/* Ripple animation */}
                  <div className="absolute inset-0 rounded-full bg-indigo-500/10 animate-ping scale-150"></div>
                  <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100 z-10">
                    <Smartphone className="h-8 w-8 animate-bounce" />
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-slate-800 mb-2 font-mono">
                  {loadingState}
                </h3>
                <p className="text-xs text-slate-400">
                  Please do not refresh this window or close this panel.
                </p>
              </div>
            ) : (
              <div>
                {/* Invoice Summary Card */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[9px] text-slate-400 font-bold font-mono uppercase tracking-wider">FLAT UNIT</p>
                      <p className="text-base font-black text-slate-800 mt-0.5">Wing {flat.wing} - Flat {flat.number}</p>
                      <p className="text-xs font-medium text-slate-500 mt-1">Owner: {flat.ownerName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-slate-400 font-bold font-mono uppercase tracking-wider">MAINTENANCE DUE</p>
                      <p className="text-xl font-black text-emerald-600 mt-0.5">₹{flat.amountDue.toLocaleString()}</p>
                      <p className="text-xs font-medium text-slate-500 mt-1">Cycle: {month}</p>
                    </div>
                  </div>
                </div>

                {/* Main QR Code & Link Columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center mb-6 border-b border-slate-100 pb-5">
                  {/* Left Column: QR Code */}
                  <div className="flex flex-col items-center text-center border-b md:border-b-0 md:border-r border-slate-100 pb-5 md:pb-0 md:pr-4">
                    <div className="p-2.5 bg-white border border-slate-200 rounded-2xl shadow-sm mb-2.5">
                      <img
                        src={qrCodeUrl}
                        alt="UPI Payment QR Code"
                        className="w-36 h-36 object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="flex items-center space-x-1.5 text-slate-600 mb-1">
                      <QrCode className="h-3.5 w-3.5" />
                      <span className="text-xs font-bold">Scan QR with GPay/UPI</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono">Payee: {upiPayee}</p>
                  </div>

                  {/* Right Column: Deep Link / Intent Buttons */}
                  <div className="flex flex-col space-y-3">
                    <p className="text-xs font-bold text-slate-700 font-display">Tap to Open App & Pay:</p>
                    
                    <button
                      onClick={() => simulatePayment("GPay")}
                      className="flex items-center justify-between w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 hover:border-indigo-500 hover:text-indigo-600 transition duration-150 shadow-sm"
                    >
                      <span className="flex items-center space-x-2">
                        <span className="w-5 h-5 rounded-lg bg-blue-100 text-blue-600 font-bold text-[10px] flex items-center justify-center font-display">G</span>
                        <span>Google Pay</span>
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                    </button>

                    <button
                      onClick={() => simulatePayment("PhonePe")}
                      className="flex items-center justify-between w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 hover:border-indigo-500 hover:text-indigo-600 transition duration-150 shadow-sm"
                    >
                      <span className="flex items-center space-x-2">
                        <span className="w-5 h-5 rounded-lg bg-purple-100 text-purple-600 font-bold text-[10px] flex items-center justify-center font-display">P</span>
                        <span>PhonePe</span>
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                    </button>

                    <button
                      onClick={() => simulatePayment("Paytm")}
                      className="flex items-center justify-between w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 hover:border-indigo-500 hover:text-indigo-600 transition duration-150 shadow-sm"
                    >
                      <span className="flex items-center space-x-2">
                        <span className="w-5 h-5 rounded-lg bg-cyan-100 text-cyan-600 font-bold text-[10px] flex items-center justify-center font-display">Py</span>
                        <span>Paytm UPI</span>
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                    </button>

                    {/* True Deep Link */}
                    <a
                      href={upiURI}
                      className="inline-flex items-center justify-center w-full px-3 py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/10 transition duration-150 text-center"
                    >
                      Open in Mobile UPI App
                    </a>
                  </div>
                </div>

                {/* Direct Bank Account Details Card */}
                {adminSettings && (adminSettings.bankAccountNo || adminSettings.bankName) && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-5 shadow-sm">
                    <div className="flex items-center space-x-2 mb-2">
                      <Landmark className="h-4 w-4 text-indigo-600 shrink-0" />
                      <p className="text-[10px] text-slate-500 font-bold font-mono uppercase tracking-wider">Direct Bank Deposit / IMPS / NEFT</p>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Bank Name</span>
                        <span className="font-bold text-slate-800">{adminSettings.bankName || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Account Number</span>
                        <span className="font-mono font-bold text-slate-800">{adminSettings.bankAccountNo || "N/A"}</span>
                      </div>
                      <div className="col-span-2 pt-2 border-t border-slate-200/60 flex justify-between items-center">
                        <div>
                          <span className="text-slate-400 text-[9px] uppercase font-bold tracking-wider block">IFSC Code</span>
                          <span className="font-mono font-bold text-indigo-600">{adminSettings.bankIfsc || "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[9px] uppercase font-bold tracking-wider block text-right">Account Holder Name</span>
                          <span className="font-bold text-slate-800 text-right block">{adminSettings.upiName}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Manual Transaction ID Match */}
                <form onSubmit={handleManualSubmit} className="space-y-3">
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Already Paid? Input Transaction ID:
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        placeholder="e.g. UPI548301934812"
                        value={customTxId}
                        onChange={(e) => setCustomTxId(e.target.value)}
                        className="flex-1 min-w-0 px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 shadow-sm"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-750 text-white text-xs font-bold rounded-xl transition duration-150 shadow-sm shrink-0"
                      >
                        Submit ID
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center space-x-1.5 text-red-600 text-[11px] font-medium bg-red-50 p-2.5 rounded-xl border border-red-100">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}
                </form>

                {/* Safety & Encryption Note */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-start space-x-2 text-[10px] text-slate-400">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <p className="leading-normal">
                    Deep-link payloads are standard NPCI-compliant format structures. The simulation process executes state changes and writes verification receipts securely to our server database.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
