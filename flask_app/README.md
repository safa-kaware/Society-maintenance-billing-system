# Automated Society Maintenance Billing System (Flask Stack)

This is a production-ready implementation of the housing society maintenance billing system built using **Python with Flask**, **SQLite**, and **ReportLab** for PDF billing.

## Core Features
1. **Resident Portal**: Let residents query their flat (e.g., A-101) to view dues, initiate mock UPI payment deep links, scan automatically generated QR codes, and retrieve itemized PDF receipts.
2. **Admin Command Dashboard**: Check collection statistics (efficiency ratio, total collected, unpaid properties) and manually log cash, cheque, or bank deposits to update resident states.
3. **Automated ReportLab Bills**: Programmatically generates beautiful, professional PDF receipts on the fly containing Date, Flat Unit, Amount Paid, and Transaction IDs, ready for sharing or printing.

---

## Folder Layout
```
/flask_app
│   ├── app.py                      # Core routing, models, and PDF generation
│   ├── requirements.txt            # Dependency configuration manifest
│   ├── README.md                   # Installation & Setup documentation
│   └── templates/                  # Frontend HTML layout templates
│       ├── base.html               # Global Tailwind CSS layout skeleton
│       ├── login.html              # Search/login flat page
│       ├── resident_dashboard.html # Resident UPI panel & downloads
│       └── admin_dashboard.html    # Admin collections control grid
```

---

## Local Setup & Installation Instructions

Ensure you have **Python 3.8+** installed on your operating system.

### Step 1: Clone or Navigate to the directory
Open your terminal and enter the directory containing the Flask files:
```bash
cd flask_app
```

### Step 2: Create a Virtual Environment (Recommended)
Isolate your dependencies to prevent version conflicts on your operating system:
```bash
# On macOS / Linux
python3 -m venv venv
source venv/bin/activate

# On Windows (Command Prompt)
python -m venv venv
venv\Scripts\activate
```

### Step 3: Install Required Dependencies
Install Flask, SQLAlchemy, and ReportLab securely:
```bash
pip install -r requirements.txt
```

### Step 4: Initialize and Seed the Database
Our Flask application includes built-in database seeding logic that automatically provisions the SQLite schema (`society_maintenance.db`) and seeds it with **48 residential flats** across wings A, B, and C with randomized payment statuses:
```bash
# Initialize and seed database
python -c "from app import db; db.create_all()"
```
*Note: If you run `python app.py` directly, the app is configured to auto-detect an empty database and automatically seed it for a seamless out-of-the-box experience.*

### Step 5: Start the Development Server
Launch the Flask development server on your machine:
```bash
python app.py
```

Open your browser and navigate to:
* **Resident Portal**: `http://127.0.0.1:5000/`
* **Admin Command Center**: `http://127.0.0.1:5000/admin`

---

## Technical Specifications
- **Database Engine**: SQLite (self-contained, serverless file-based system)
- **PDF Generation Layout Engine**: ReportLab (streams raw binary bytes directly from memory without utilizing temp files)
- **CSS Styling Framework**: Tailwind CSS CDN Play Utility
- **Deep Linking Protocol**: NPCI Unified Payments Interface (`upi://pay?pa=...`) standard
