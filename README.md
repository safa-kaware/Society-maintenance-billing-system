# Society Maintenance & Billing System

A comprehensive digital solution for managing housing society maintenance, billing, and payments. This application provides a streamlined interface for both residents to pay their dues and administrators to manage the society's finances.

**🌐 Live Demo:** [https://society-maintenance-billing-system.vercel.app/](https://society-maintenance-billing-system.vercel.app/)

## 🚀 Overview

The **Society Maintenance & Billing System** is a dual-portal application designed to automate the manual process of collecting maintenance fees. It features a modern, mobile-first React frontend and a robust Node.js/Express backend.

### Key Features

#### 🏠 Resident Portal
- **Secure Login:** Access via Flat ID and registered mobile number.
- **Dues Tracking:** Real-time view of outstanding maintenance fees for the current month.
- **Digital Payments:** Integrated mock UPI payment flow with deep links for **Google Pay**, **PhonePe**, and **Paytm**.
- **Instant Receipts:** Generate and download professional PDF maintenance receipts immediately after payment.
- **Transaction History:** View a complete ledger of past payments and transaction IDs.

#### 🛡️ Admin Dashboard
- **Financial Overview:** Real-time statistics on total collection, outstanding dues, and collection percentage.
- **Unit Management:** Add, edit, or remove flat records and resident details.
- **Manual Overrides:** Mark dues as paid for cash or cheque payments.
- **Bilingual Notifications:** Generate and send automated payment reminders or receipts via **WhatsApp** in both **English and Marathi**.
- **Data Export:** Download the entire society ledger as a **CSV file** for auditing and offline records.
- **Global Settings:** Configure society UPI IDs, bank details, and contact information.

## 🛠️ Tech Stack

### Frontend
- **React 19:** Modern UI library for building the interface.
- **TypeScript:** Ensuring type safety and better developer experience.
- **Tailwind CSS v4:** Utility-first CSS framework for responsive and modern styling.
- **Lucide React:** A beautiful and consistent icon library.
- **jsPDF:** Client-side PDF generation for receipts.
- **Vite:** High-performance build tool and development server.

### Backend
- **Node.js & Express:** Scalable server-side environment and web framework.
- **Stateless JWT Auth:** Secure, token-based authentication for residents and admins.
- **JSON Database:** Lightweight and portable data storage (`db.json`).
- **Crypto:** Native Node.js encryption for secure password hashing and token signing.

### Secondary Implementation (Legacy)
- **Flask & SQLAlchemy:** A Python-based alternative implementation located in the `flask_app` directory.
- **SQLite:** Database for the Flask implementation.
- **ReportLab:** Server-side PDF generation for the Python backend.

## ⚙️ Installation & Setup

### Prerequisites
- **Node.js** (v18 or higher recommended)
- **npm** or **pnpm**

### Steps
1. **Clone the Repository:**
   ```bash
   git clone https://github.com/safa-kaware/Society-maintenance-billing-system.git
   cd Society-maintenance-billing-system
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Environment Configuration:**
   Create a `.env` file in the root directory (referencing `.env.example`):
   ```env
   JWT_SECRET="your_secure_jwt_secret"
   ADMIN_PASSWORD="your_admin_password"
   ```

4. **Run the Application:**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:3000`.

## 📂 Project Structure

- `src/`: React frontend source code.
  - `components/`: UI components for Resident and Admin portals.
  - `utils/`: Utility functions for PDF generation and API calls.
- `server.ts/`: Main Express server and API logic.
- `flask_app/`: Alternate Python/Flask implementation.
- `assets/`: Static assets and icons.
- `db.json`: Local database file (auto-generated).

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
