export interface Payment {
  id: string;
  amount: number;
  date: string;
  transactionId: string;
  method: "GPay" | "PhonePe" | "Paytm" | "UPI" | "Cash" | "Manual Verification";
  notes?: string;
}

export interface Flat {
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

export interface AdminSettings {
  upiPayee: string;
  upiName: string;
  bankName: string;
  bankAccountNo: string;
  bankIfsc: string;
  whatsappNumber: string;
}

export interface DBState {
  month: string;
  flats: Flat[];
  adminSettings?: AdminSettings;
}
