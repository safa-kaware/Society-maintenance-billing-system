import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "kaveri_bldg_secure_jwt_secret_2026_default";
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD || "KaveriAdmin2026";

// Secure Stateless JWT Helper (using native Node crypto for zero-dependency)
interface JWTPayload {
  role: "admin" | "resident";
  flatId?: string;
}

function generateToken(payload: JWTPayload): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payloadStr = Buffer.from(
    JSON.stringify({
      ...payload,
      exp: Date.now() + 24 * 60 * 60 * 1000, // 24 Hours validity
    })
  ).toString("base64url");
  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${payloadStr}`)
    .digest("base64url");
  return `${header}.${payloadStr}.${signature}`;
}

function verifyToken(token: string): JWTPayload | null {
  try {
    const [header, payloadStr, signature] = token.split(".");
    if (!header || !payloadStr || !signature) return null;

    const expectedSignature = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(`${header}.${payloadStr}`)
      .digest("base64url");
    if (signature !== expectedSignature) return null;

    const payload = JSON.parse(Buffer.from(payloadStr, "base64url").toString("utf-8"));
    if (payload.exp && Date.now() > payload.exp) {
      return null; // Expired
    }
    return {
      role: payload.role,
      flatId: payload.flatId,
    };
  } catch (err) {
    return null;
  }
}


interface Payment {
  id: string;
  amount: number;
  date: string;
  transactionId: string;
  method: "GPay" | "PhonePe" | "Paytm" | "UPI" | "Cash" | "Manual Verification";
  notes?: string;
}

interface Flat {
  id: string; // e.g. "A-101"
  wing: string; // e.g. "A"
  number: string; // e.g. "101"
  ownerName: string;
  contactNumber: string;
  email: string;
  amountDue: number;
  status: "Paid" | "Unpaid";
  paymentHistory: Payment[];
}

interface AdminSettings {
  upiPayee: string;
  upiName: string;
  bankName: string;
  bankAccountNo: string;
  bankIfsc: string;
  whatsappNumber: string;
}

interface DBState {
  month: string;
  flats: Flat[];
  adminSettings?: AdminSettings;
}

const DEFAULT_SETTINGS: AdminSettings = {
  upiPayee: "society@okbank",
  upiName: "Heights CHS Maintenance Account",
  bankName: "State Bank of India",
  bankAccountNo: "38491029481",
  bankIfsc: "SBIN0001234",
  whatsappNumber: "9820001122"
};

const DB_FILE = path.join(process.cwd(), "db.json");

// Helper to load DB
function loadDB(): DBState {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(data);
      if (!parsed.adminSettings) {
        parsed.adminSettings = { ...DEFAULT_SETTINGS };
        saveDB(parsed);
      }
      return parsed;
    }
  } catch (error) {
    console.error("Error reading database file, resetting to defaults...", error);
  }
  return resetDB();
}

// Helper to save DB
function saveDB(state: DBState) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing to database file", error);
  }
}

// Reset/Initialize DB with realistic default data
function resetDB(): DBState {
  const wings = ["D"];
  const floors = [1, 2, 3, 4];
  const flatsPerFloor = [1, 2, 3, 4];
  const ownerNames = [
    "Rajesh Sharma", "Priya Patel", "Amit Verma", "Sunita Rao",
    "Vijay Nair", "Meera Joshi", "Sanjay Gupta", "Deepa Reddy",
    "Anil Kumar", "Kavita Singh", "Rohan Mehta", "Neha Deshmukh",
    "Vikram Malhotra", "Aisha Khan", "Manoj Tiwari", "Anjali Bose"
  ];

  const flats: Flat[] = [];
  let nameIndex = 0;

  wings.forEach((wing) => {
    floors.forEach((floor) => {
      flatsPerFloor.forEach((num) => {
        const flatNum = `${floor}0${num}`;
        const id = `${wing}-${flatNum}`;
        const ownerName = ownerNames[nameIndex % ownerNames.length];
        nameIndex++;

        let contactNumber = `982${Math.floor(1000000 + Math.random() * 9000000)}`;
        let email = `${ownerName.toLowerCase().replace(/\s+/g, ".")}@example.com`;
        let status: "Paid" | "Unpaid" = Math.random() < 0.6 ? "Paid" : "Unpaid";
        const amountDue = 2500; // standard maintenance charge
        let paymentHistory: Payment[] = [];

        // Stable demo account overrides for predictable, secure logins
        if (id === "D-101") {
          contactNumber = "9820001111";
          status = "Unpaid";
        } else if (id === "D-102") {
          contactNumber = "9820002222";
          status = "Paid";
        } else if (id === "D-103") {
          contactNumber = "9820003333";
          status = "Unpaid";
        }

        if (status === "Paid") {
          const txDate = new Date();
          // subtract some random days/hours
          txDate.setDate(txDate.getDate() - Math.floor(Math.random() * 10));
          txDate.setHours(txDate.getHours() - Math.floor(Math.random() * 12));

          const methods: ("GPay" | "PhonePe" | "Paytm" | "UPI" | "Cash")[] = ["GPay", "PhonePe", "Paytm", "UPI", "Cash"];
          const method = methods[Math.floor(Math.random() * methods.length)];

          paymentHistory.push({
            id: `TX-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
            amount: amountDue,
            date: txDate.toISOString(),
            transactionId: method === "Cash" ? "N/A" : `UPI${Math.floor(100000000000 + Math.random() * 900000000000)}`,
            method,
            notes: method === "Cash" ? "Paid in cash to society supervisor" : "Auto-verified via UPI deep-link",
          });
        }

        flats.push({
          id,
          wing,
          number: flatNum,
          ownerName,
          contactNumber,
          email,
          amountDue,
          status,
          paymentHistory,
        });
      });
    });
  });

  const state: DBState = {
    month: "June 2026",
    flats,
    adminSettings: { ...DEFAULT_SETTINGS }
  };

  saveDB(state);
  return state;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Helper to extract JWT authorization token payload
  const getAuth = (req: express.Request): JWTPayload | null => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }
    const token = authHeader.split(" ")[1];
    return verifyToken(token);
  };

  // ================= PUBLIC API ENDPOINTS =================

  // API Route: Get public list of flat IDs and owner names (safe for selection dropdown, no email, phone, dues or ledger leak)
  app.get("/api/public/flats", (req, res) => {
    const dbState = loadDB();
    const publicFlats = dbState.flats.map((f) => ({
      id: f.id,
      ownerName: f.ownerName,
    }));
    res.json({ flats: publicFlats });
  });

  // API Route: Get public credentials for the first 3 flats (safe for demo, helper only returns ID, owner name, contact number)
  app.get("/api/public/demo", (req, res) => {
    const dbState = loadDB();
    const demoFlats = dbState.flats.slice(0, 3).map((f) => ({
      id: f.id,
      ownerName: f.ownerName,
      contactNumber: f.contactNumber,
    }));
    res.json({ flats: demoFlats });
  });

  // API Route: Verify Resident login credentials and issue signed token
  app.post("/api/resident/login", (req, res) => {
    const { flatId, contactNumber } = req.body;
    if (!flatId || !contactNumber) {
      return res.status(400).json({ error: "Flat ID and contact number are required." });
    }

    const dbState = loadDB();
    const flat = dbState.flats.find((f) => f.id.toUpperCase() === flatId.toUpperCase());
    if (!flat) {
      return res.status(404).json({ error: "Flat ID not found in society database." });
    }

    const cleanInput = contactNumber.trim().replace(/\s+/g, "");
    const cleanTarget = flat.contactNumber.trim().replace(/\s+/g, "");

    if (cleanInput !== cleanTarget) {
      return res.status(401).json({ error: "Verification failed: Mobile number does not match registered owner records." });
    }

    const token = generateToken({ role: "resident", flatId: flat.id });
    res.json({
      success: true,
      token,
      flat,
      month: dbState.month,
      adminSettings: dbState.adminSettings,
    });
  });

  // API Route: Verify Admin login passcode and issue signed token
  app.post("/api/admin/login", (req, res) => {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: "Password is required." });
    }

    if (password !== ADMIN_PASSWORD_HASH) {
      return res.status(401).json({ error: "Verification failed: Invalid admin security passcode." });
    }

    const token = generateToken({ role: "admin" });
    const dbState = loadDB();
    res.json({
      success: true,
      token,
      state: dbState,
    });
  });

  // ================= SECURED API ENDPOINTS (ADMIN ONLY) =================

  // API Route: Get all flats (including query parameters for search/filtering)
  app.get("/api/flats", (req, res) => {
    const auth = getAuth(req);
    if (!auth || auth.role !== "admin") {
      return res.status(403).json({ error: "Access Denied: Admin authorization required." });
    }
    const dbState = loadDB();
    res.json(dbState);
  });

  // API Route: Update Admin Settings (WhatsApp number, UPI details, Bank details)
  app.post("/api/settings", (req, res) => {
    const auth = getAuth(req);
    if (!auth || auth.role !== "admin") {
      return res.status(403).json({ error: "Access Denied: Admin authorization required." });
    }

    const dbState = loadDB();
    const { upiPayee, upiName, bankName, bankAccountNo, bankIfsc, whatsappNumber } = req.body;

    dbState.adminSettings = {
      upiPayee: (upiPayee || "").trim() || DEFAULT_SETTINGS.upiPayee,
      upiName: (upiName || "").trim() || DEFAULT_SETTINGS.upiName,
      bankName: (bankName || "").trim(),
      bankAccountNo: (bankAccountNo || "").trim(),
      bankIfsc: (bankIfsc || "").trim(),
      whatsappNumber: (whatsappNumber || "").trim() || DEFAULT_SETTINGS.whatsappNumber,
    };

    saveDB(dbState);
    res.json({ success: true, message: "Settings updated successfully", state: dbState });
  });

  // API Route: Reset database
  app.post("/api/reset", (req, res) => {
    const auth = getAuth(req);
    if (!auth || auth.role !== "admin") {
      return res.status(403).json({ error: "Access Denied: Admin authorization required." });
    }

    const newState = resetDB();
    res.json({ success: true, message: "Database reset to default housing society state", state: newState });
  });

  // API Route: Clear all database entries (Wipe dummy data)
  app.post("/api/clear", (req, res) => {
    const auth = getAuth(req);
    if (!auth || auth.role !== "admin") {
      return res.status(403).json({ error: "Access Denied: Admin authorization required." });
    }

    const dbState = loadDB();
    dbState.flats = [];
    saveDB(dbState);
    res.json({ success: true, message: "All housing society flat records wiped", state: dbState });
  });

  // API Route: Create/Add custom flat unit
  app.post("/api/flats", (req, res) => {
    const auth = getAuth(req);
    if (!auth || auth.role !== "admin") {
      return res.status(403).json({ error: "Access Denied: Admin authorization required." });
    }

    const dbState = loadDB();
    const { wing, number, ownerName, contactNumber, email, amountDue } = req.body;

    if (!wing || !number || !ownerName || !contactNumber || !email) {
      return res.status(400).json({ error: "Missing required flat registration details." });
    }

    const id = `${wing.toUpperCase().trim()}-${number.trim()}`;

    // Check if flat already exists
    const exists = dbState.flats.some((f) => f.id.toUpperCase() === id.toUpperCase());
    if (exists) {
      return res.status(400).json({ error: `Unit ${id} is already registered in the system.` });
    }

    const newFlat: Flat = {
      id,
      wing: wing.toUpperCase().trim(),
      number: number.trim(),
      ownerName: ownerName.trim(),
      contactNumber: contactNumber.trim(),
      email: email.trim(),
      amountDue: Number(amountDue) || 2500,
      status: "Unpaid",
      paymentHistory: [],
    };

    dbState.flats.push(newFlat);
    saveDB(dbState);
    res.json({ success: true, flat: newFlat, state: dbState });
  });

  // API Route: Delete a flat unit
  app.delete("/api/flats/:flatId", (req, res) => {
    const auth = getAuth(req);
    if (!auth || auth.role !== "admin") {
      return res.status(403).json({ error: "Access Denied: Admin authorization required." });
    }

    const dbState = loadDB();
    const flatId = req.params.flatId;
    const initialCount = dbState.flats.length;
    dbState.flats = dbState.flats.filter((f) => f.id.toUpperCase() !== flatId.toUpperCase());

    if (dbState.flats.length === initialCount) {
      return res.status(404).json({ error: "Flat not found" });
    }

    saveDB(dbState);
    res.json({ success: true, message: `Unit ${flatId} deleted successfully`, state: dbState });
  });

  // API Route: Update flat status manually (Admin operation)
  app.post("/api/flats/:flatId/status", (req, res) => {
    const auth = getAuth(req);
    if (!auth || auth.role !== "admin") {
      return res.status(403).json({ error: "Access Denied: Admin authorization required." });
    }

    const dbState = loadDB();
    const flatId = req.params.flatId;
    const { status, amount, method, notes, ownerName, contactNumber, email } = req.body;

    const flatIndex = dbState.flats.findIndex((f) => f.id.toUpperCase() === flatId.toUpperCase());
    if (flatIndex === -1) {
      return res.status(404).json({ error: "Flat not found" });
    }

    const flat = dbState.flats[flatIndex];

    // Update optional details
    if (ownerName) flat.ownerName = ownerName;
    if (contactNumber) flat.contactNumber = contactNumber;
    if (email) flat.email = email;
    if (amount !== undefined) flat.amountDue = Number(amount);

    if (status === "Paid" && flat.status !== "Paid") {
      // Transition from Unpaid to Paid
      const newPayment: Payment = {
        id: `TX-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        amount: flat.amountDue,
        date: new Date().toISOString(),
        transactionId: `MAN-${Math.floor(100000 + Math.random() * 900000)}`,
        method: (method as any) || "Cash",
        notes: notes || "Manually updated by Admin",
      };
      flat.paymentHistory.push(newPayment);
      flat.status = "Paid";
    } else if (status === "Unpaid") {
      // Reset status to unpaid
      flat.status = "Unpaid";
    }

    dbState.flats[flatIndex] = flat;
    saveDB(dbState);

    res.json({ success: true, flat, state: dbState });
  });

  // ================= SECURED API ENDPOINTS (ADMIN OR RELEVANT RESIDENT) =================

  // API Route: Get specific flat details
  app.get("/api/flats/:flatId", (req, res) => {
    const flatId = req.params.flatId;
    const auth = getAuth(req);
    if (!auth) {
      return res.status(401).json({ error: "Access Denied: Authentication token required." });
    }

    // Access control: Resident can only view their own flatId, Admin can view any flatId
    if (auth.role !== "admin" && auth.flatId?.toUpperCase() !== flatId.toUpperCase()) {
      return res.status(403).json({ error: "Access Denied: You do not have permission to access another flat's records." });
    }

    const dbState = loadDB();
    const flat = dbState.flats.find((f) => f.id.toUpperCase() === flatId.toUpperCase());
    if (!flat) {
      return res.status(404).json({ error: "Flat not found" });
    }
    res.json(flat);
  });

  // API Route: Submit UPI Payment
  app.post("/api/flats/:flatId/pay", (req, res) => {
    const flatId = req.params.flatId;
    const auth = getAuth(req);
    if (!auth) {
      return res.status(401).json({ error: "Access Denied: Authentication token required." });
    }

    // Access control: Resident can only pay for their own flatId, Admin can submit for any flatId
    if (auth.role !== "admin" && auth.flatId?.toUpperCase() !== flatId.toUpperCase()) {
      return res.status(403).json({ error: "Access Denied: You do not have permission to submit payments for another flat's ledger." });
    }

    const dbState = loadDB();
    const { transactionId, method, amount, notes } = req.body;

    const flatIndex = dbState.flats.findIndex((f) => f.id.toUpperCase() === flatId.toUpperCase());
    if (flatIndex === -1) {
      return res.status(404).json({ error: "Flat not found" });
    }

    const flat = dbState.flats[flatIndex];
    if (flat.status === "Paid") {
      return res.status(400).json({ error: "Maintenance is already marked as paid for this month." });
    }

    // Record the payment
    const newPayment: Payment = {
      id: `TX-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      amount: amount || flat.amountDue,
      date: new Date().toISOString(),
      transactionId: transactionId || `UPI${Math.floor(100000000000 + Math.random() * 900000000000)}`,
      method: method || "UPI",
      notes: notes || "Payment received via UPI App Gateway Simulation",
    };

    flat.paymentHistory.push(newPayment);
    flat.status = "Paid";

    dbState.flats[flatIndex] = flat;
    saveDB(dbState);

    res.json({ success: true, flat, payment: newPayment });
  });

  // Vite Integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
