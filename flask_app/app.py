import os
import random
from datetime import datetime
from flask import Flask, render_code, render_template, request, redirect, url_for, flash, send_file, jsonify
from flask_sqlalchemy import SQLAlchemy
import io

# Imports for ReportLab PDF Generation
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.pdfgen import canvas

app = Flask(__name__)
app.secret_key = "society_billing_secure_session_key"

# Database Configuration (SQLite)
# Saves database to 'society_maintenance.db' in the project directory
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///society_maintenance.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# -----------------------------------------------------------------------------
# DATABASE SCHEMA (SQLAlchemy Models)
# -----------------------------------------------------------------------------

class Resident(db.Model):
    __tablename__ = 'residents'
    
    id = db.Column(db.String(20), primary_key=True)  # e.g., "A-101"
    wing = db.Column(db.String(5), nullable=False)   # e.g., "A"
    flat_number = db.Column(db.String(10), nullable=False) # e.g., "101"
    owner_name = db.Column(db.String(100), nullable=False)
    contact_number = db.Column(db.String(15), nullable=False)
    email = db.Column(db.String(100), nullable=False)
    amount_due = db.Column(db.Float, default=2500.0)
    status = db.Column(db.String(20), default="Unpaid")  # "Paid" or "Unpaid"
    
    # Relationship to Payments
    payments = db.relationship('Payment', backref='resident', lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "wing": self.wing,
            "flat_number": self.flat_number,
            "owner_name": self.owner_name,
            "contact_number": self.contact_number,
            "email": self.email,
            "amount_due": self.amount_due,
            "status": self.status
        }


class Payment(db.Model):
    __tablename__ = 'payments'
    
    id = db.Column(db.String(20), primary_key=True)  # e.g., "TX-A101-948"
    flat_id = db.Column(db.String(20), db.ForeignKey('residents.id'), nullable=False)
    amount_paid = db.Column(db.Float, nullable=False)
    payment_date = db.Column(db.DateTime, default=datetime.utcnow)
    transaction_id = db.Column(db.String(50), nullable=False) # UPI Tx ID or Manual ID
    method = db.Column(db.String(50), nullable=False) # "GPay", "PhonePe", "UPI", "Cash", etc.
    notes = db.Column(db.String(200), nullable=True)

# -----------------------------------------------------------------------------
# HELPER: REPORTLAB PDF RECEIPT GENERATION
# -----------------------------------------------------------------------------

def build_receipt_pdf(resident, payment):
    """
    Generates a high-quality maintenance payment receipt in memory as a PDF
    using ReportLab Draw Canvas primitives.
    """
    buffer = io.BytesIO()
    
    # Create letter-size page
    p = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter # 612 x 792 points
    
    # Colors
    primary_color = colors.HexColor("#1e293b")  # slate-800
    secondary_color = colors.HexColor("#475569") # slate-600
    accent_color = colors.HexColor("#10b981")    # emerald-500
    dark_text = colors.HexColor("#1e293b")
    light_gray = colors.HexColor("#cbd5e1")
    
    # Page Border
    p.setStrokeColor(primary_color)
    p.setLineWidth(1)
    p.rect(18, 18, width - 36, height - 36)
    
    # Header Banner Background
    p.setFillColor(primary_color)
    p.rect(18, height - 100, width - 36, 82, stroke=0, fill=1)
    
    # Header Titles
    p.setFillColor(colors.white)
    p.setFont("Helvetica-Bold", 18)
    p.drawString(35, height - 48, "HEIGHTS CO-OPERATIVE HOUSING SOCIETY")
    p.setFont("Helvetica", 9)
    p.setFillColor(colors.HexColor("#cbd5e1"))
    p.drawString(35, height - 63, "Automated Digital Maintenance Clearance Receipt")
    p.drawString(35, height - 76, "Regd No: CHS/MUM/10294/2026 | Mumbai, MH, India")
    
    # Receipt Banner Title (Right Aligned)
    p.setFillColor(colors.white)
    p.setFont("Helvetica-Bold", 12)
    p.drawRightString(width - 35, height - 45, "MAINTENANCE RECEIPT")
    p.setFont("Helvetica", 8)
    p.drawRightString(width - 35, height - 60, f"No: {payment.id}")
    p.drawRightString(width - 35, height - 72, f"Cycle: June 2026")
    
    # Reset Fill Color
    p.setFillColor(dark_text)
    
    # ------------------ Columns: Resident & Transaction Info ------------------
    col_y = height - 150
    
    # Left Column - Resident Information
    p.setFont("Helvetica-Bold", 10)
    p.drawString(35, col_y, "ISSUED TO (RESIDENT):")
    p.setFont("Helvetica", 9)
    p.drawString(35, col_y - 18, f"Owner Name: {resident.owner_name}")
    p.drawString(35, col_y - 32, f"Flat Number: Wing {resident.wing} - Flat {resident.flat_number}")
    p.drawString(35, col_y - 46, f"Contact No: +91 {resident.contact_number}")
    p.drawString(35, col_y - 60, f"Email ID: {resident.email}")
    
    # Right Column - Payment metadata
    p.setFont("Helvetica-Bold", 10)
    p.drawString(width / 2 + 20, col_y, "TRANSACTION CLEARANCE:")
    p.setFont("Helvetica", 9)
    p.drawString(width / 2 + 20, col_y - 18, f"Payment Date: {payment.payment_date.strftime('%d-%b-%Y %I:%M %p')}")
    p.drawString(width / 2 + 20, col_y - 32, f"Receipt Method: {payment.method}")
    p.drawString(width / 2 + 20, col_y - 46, f"Transaction Ref: {payment.transaction_id}")
    p.drawString(width / 2 + 20, col_y - 60, "Clearance Status: Verified & Cleared")
    
    # Separator Line
    p.setStrokeColor(light_gray)
    p.setLineWidth(0.5)
    p.line(35, col_y - 80, width - 35, col_y - 80)
    
    # ------------------ Invoice Details Table ------------------
    table_y = col_y - 110
    p.setFont("Helvetica-Bold", 10)
    p.drawString(35, table_y, "BILLING BREAKDOWN")
    
    # Table Header Box
    p.setFillColor(secondary_color)
    p.rect(35, table_y - 20, width - 70, 16, stroke=0, fill=1)
    
    p.setFillColor(colors.white)
    p.setFont("Helvetica-Bold", 8)
    p.drawString(45, table_y - 14, "Sr No.")
    p.drawString(100, table_y - 14, "Item Description")
    p.drawString(320, table_y - 14, "Billing Duration")
    p.drawRightString(width - 45, table_y - 14, "Amount Paid (INR)")
    
    # Table Row Background
    p.setFillColor(colors.HexColor("#f8fafc"))
    p.rect(35, table_y - 42, width - 70, 22, stroke=0, fill=1)
    
    p.setFillColor(dark_text)
    p.setFont("Helvetica", 8.5)
    p.drawString(45, table_y - 33, "1")
    p.drawString(100, table_y - 33, "Monthly Maintenance and Common Amenity Maintenance Fees")
    p.drawString(320, table_y - 33, "June 2026")
    p.drawRightString(width - 45, table_y - 33, f"Rs. {payment.amount_paid:.2f}")
    
    # Table Total Box
    p.setStrokeColor(light_gray)
    p.line(35, table_y - 42, width - 35, table_y - 42)
    
    p.setFont("Helvetica-Bold", 10)
    p.drawString(300, table_y - 60, "Total Amount Paid:")
    p.setFillColor(accent_color)
    p.drawRightString(width - 45, table_y - 60, f"Rs. {payment.amount_paid:.2f}")
    
    # ------------------ Admin Remarks / Note ------------------
    note_y = table_y - 95
    p.setFillColor(colors.HexColor("#f8fafc"))
    p.setStrokeColor(primary_color)
    p.setLineWidth(0.3)
    p.rect(35, note_y, width - 70, 28, fill=1, stroke=1)
    
    p.setFillColor(primary_color)
    p.setFont("Helvetica-Bold", 8)
    p.drawString(42, note_y + 18, "ADMIN REMARKS & TERMS:")
    p.setFont("Helvetica-Oblique", 7.5)
    p.setFillColor(secondary_color)
    remarks = payment.notes if payment.notes else "Society dues settled. Thank you for your digital contribution."
    p.drawString(42, note_y + 8, remarks)
    
    # Rules/Terms
    p.setFont("Helvetica", 7)
    p.drawString(35, note_y - 20, "1. This digital clearance bill does not require a physical signature as it is verified via modern UPI transaction matching.")
    p.drawString(35, note_y - 29, "2. Any transaction discrepancies must be raised with the society supervisor or managing committee within 10 days of payment.")
    
    # Signatures
    sig_y = note_y - 75
    p.setStrokeColor(light_gray)
    p.line(35, sig_y, 140, sig_y)
    p.line(width - 150, sig_y, width - 35, sig_y)
    
    p.setFont("Helvetica", 7.5)
    p.setFillColor(dark_text)
    p.drawString(45, sig_y - 11, "Authorized Representative")
    p.drawString(42, sig_y - 20, "Society Managing Committee")
    
    p.drawRightString(width - 45, sig_y - 11, "Resident Acknowledgement")
    p.drawRightString(width - 55, sig_y - 20, "(Secure Digital Clearance)")
    
    p.showPage()
    p.save()
    
    buffer.seek(0)
    return buffer

# -----------------------------------------------------------------------------
# FLASK CONTROLLERS & ENDPOINTS
# -----------------------------------------------------------------------------

@app.route('/')
def home():
    """Renders the standard home page where users enter their Flat ID (e.g. A-101)"""
    return render_template('login.html')


@app.route('/portal', methods=['GET', 'POST'])
def resident_portal():
    """Resident Dashboard View showing dues, UPI payments, and receipt downloads"""
    if request.method == 'POST':
        flat_id = request.form.get('flat_id', '').strip().upper()
        resident = Resident.query.filter_by(id=flat_id).first()
        if not resident:
            flash("Flat ID not found! Please type an active registered flat like A-101 or B-203.", "error")
            return redirect(url_for('home'))
        return redirect(url_for('resident_portal', flat_id=flat_id))
        
    flat_id = request.args.get('flat_id', '').strip().upper()
    resident = Resident.query.filter_by(id=flat_id).first()
    if not resident:
        return redirect(url_for('home'))
        
    # Generate UPI URL deep link for trigger
    payee_upi = "society@okbank"
    payee_name = "Society Heights Maintenance"
    amount = resident.amount_due
    note = f"Maint_{resident.id}_June2026"
    
    # UPI Standard Schema Link (forces GPay, PhonePe or any app on mobile)
    upi_link = f"upi://pay?pa={payee_upi}&pn={payee_name}&am={amount}&cu=INR&tn={note}"
    
    # WhatsApp share message pre-filled
    wa_message = f"Hello, I have cleared my maintenance for Flat {resident.id} (June 2026)."
    wa_url = f"https://api.whatsapp.com/send?phone=91{resident.contact_number}&text={wa_message}"
    
    # Get last payment
    last_payment = Payment.query.filter_by(flat_id=resident.id).order_by(Payment.payment_date.desc()).first()
    
    return render_template('resident_dashboard.html', 
                           resident=resident, 
                           upi_link=upi_link, 
                           wa_url=wa_url,
                           last_payment=last_payment)


@app.route('/portal/pay/<flat_id>', methods=['POST'])
def trigger_upi_payment(flat_id):
    """Simulates a payment webhook or app deep-linking trigger"""
    resident = Resident.query.get_or_404(flat_id)
    if resident.status == "Paid":
        flash("Maintenance already paid for this billing cycle!", "info")
        return redirect(url_for('resident_portal', flat_id=flat_id))
        
    # Simulate payment details
    method = request.form.get('method', 'GPay')
    custom_tx_id = request.form.get('transaction_id', '').strip()
    
    tx_id = custom_tx_id if custom_tx_id else f"UPI{random.randint(100000000000, 999999999999)}"
    
    new_payment = Payment(
        id=f"TX-{random.randint(100000, 999999)}",
        flat_id=resident.id,
        amount_paid=resident.amount_due,
        payment_date=datetime.utcnow(),
        transaction_id=tx_id,
        method=method,
        notes=f"Auto-approved via mock UPI validation ({method})."
    )
    
    resident.status = "Paid"
    
    db.session.add(new_payment)
    db.session.commit()
    
    flash("Payment approved instantly! Thank you for paying digitally.", "success")
    return redirect(url_for('resident_portal', flat_id=flat_id))


@app.route('/portal/receipt/<payment_id>')
def download_receipt(payment_id):
    """Generates and streams the ReportLab PDF bill directly to the browser"""
    payment = Payment.query.get_or_404(payment_id)
    resident = Resident.query.get(payment.flat_id)
    
    pdf_buffer = build_receipt_pdf(resident, payment)
    
    filename = f"Receipt_{resident.id}_June2026.pdf"
    return send_file(pdf_buffer, 
                     as_attachment=True, 
                     download_name=filename, 
                     mimetype='application/pdf')


@app.route('/admin')
def admin_dashboard():
    """Admin Dashboard View showing all flats, collection stats, and manual overrides"""
    all_residents = Resident.query.all()
    
    # Stats calculations
    total_units = len(all_residents)
    paid_residents = [r for r in all_residents if r.status == "Paid"]
    paid_count = len(paid_residents)
    unpaid_count = total_units - paid_count
    
    total_expected = sum(r.amount_due for r in all_residents)
    total_collected = sum(r.amount_due for r in paid_residents)
    collection_ratio = round((total_collected / total_expected) * 100) if total_expected > 0 else 0
    
    # Active wing filter
    wing_filter = request.args.get('wing', 'All')
    status_filter = request.args.get('status', 'All')
    
    query = Resident.query
    if wing_filter != 'All':
        query = query.filter_by(wing=wing_filter)
    if status_filter != 'All':
        query = query.filter_by(status=status_filter)
        
    residents_list = query.all()
    
    return render_template('admin_dashboard.html',
                           residents=residents_list,
                           total_units=total_units,
                           paid_count=paid_count,
                           unpaid_count=unpaid_count,
                           total_collected=total_collected,
                           total_expected=total_expected,
                           collection_ratio=collection_ratio,
                           active_wing=wing_filter,
                           active_status=status_filter)


@app.route('/admin/override/<flat_id>', methods=['POST'])
def admin_manual_override(flat_id):
    """Manually mark dues as paid (e.g. for cash payers or direct cheques)"""
    resident = Resident.query.get_or_404(flat_id)
    action_status = request.form.get('status') # "Paid" or "Unpaid"
    
    if action_status == "Paid" and resident.status != "Paid":
        method = request.form.get('method', 'Cash')
        notes = request.form.get('notes', 'Manually approved by society admin.')
        
        new_payment = Payment(
            id=f"MAN-{random.randint(100000, 999999)}",
            flat_id=resident.id,
            amount_paid=resident.amount_due,
            payment_date=datetime.utcnow(),
            transaction_id=f"MAN-{random.randint(10000, 99999)}",
            method=method,
            notes=notes
        )
        resident.status = "Paid"
        db.session.add(new_payment)
    elif action_status == "Unpaid":
        resident.status = "Unpaid"
        # Delete related payments
        Payment.query.filter_by(flat_id=resident.id).delete()
        
    db.session.commit()
    flash(f"Updated status for Flat {resident.id} successfully.", "success")
    return redirect(url_for('admin_dashboard'))


# -----------------------------------------------------------------------------
# DATABASE SEEDING ROUTE (Run once to populate SQLite)
# -----------------------------------------------------------------------------

@app.cli.command("init-db")
def init_db():
    """CLI Command to initialize and seed SQLite database with demo flats"""
    db.create_all()
    
    # Check if database is already seeded
    if Resident.query.first():
        print("Database already contains records.")
        return
        
    wings = ["A", "B", "C"]
    floors = [1, 2, 3, 4]
    flats_per_floor = [1, 2, 3, 4]
    
    owner_names = [
        "Rajesh Sharma", "Priya Patel", "Amit Verma", "Sunita Rao",
        "Vijay Nair", "Meera Joshi", "Sanjay Gupta", "Deepa Reddy",
        "Anil Kumar", "Kavita Singh", "Rohan Mehta", "Neha Deshmukh",
        "Vikram Malhotra", "Aisha Khan", "Manoj Tiwari", "Anjali Bose"
    ]
    
    name_index = 0
    for wing in wings:
        for floor in floors:
            for num in flats_per_floor:
                flat_num = f"{floor}0{num}"
                flat_id = f"{wing}-{flat_num}"
                owner = owner_names[name_index % len(owner_names)]
                name_index += 1
                
                new_resident = Resident(
                    id=flat_id,
                    wing=wing,
                    flat_number=flat_num,
                    owner_name=owner,
                    contact_number=f"98210{random.randint(10000, 99999)}",
                    email=f"{owner.lower().replace(' ', '.')}@example.com",
                    amount_due=2500.0,
                    status="Unpaid"
                )
                db.session.add(new_resident)
                
    db.session.commit()
    print("Database successfully initialized with 48 residential flats!")


if __name__ == '__main__':
    # Auto-initialize sqlite schema inside current process for convenience
    with app.app_context():
        db.create_all()
        # Seed default data if empty
        if not Resident.query.first():
            wings = ["A", "B", "C"]
            floors = [1, 2, 3, 4]
            flats_per_floor = [1, 2, 3, 4]
            owner_names = [
                "Rajesh Sharma", "Priya Patel", "Amit Verma", "Sunita Rao",
                "Vijay Nair", "Meera Joshi", "Sanjay Gupta", "Deepa Reddy"
            ]
            name_idx = 0
            for wing in wings:
                for floor in floors:
                    for num in flats_per_floor:
                        flat_num = f"{floor}0{num}"
                        flat_id = f"{wing}-{flat_num}"
                        owner = owner_names[name_idx % len(owner_names)]
                        name_idx += 1
                        
                        is_paid = random.random() < 0.5
                        res = Resident(
                            id=flat_id,
                            wing=wing,
                            flat_number=flat_num,
                            owner_name=owner,
                            contact_number=f"982{random.randint(1000000, 9999999)}",
                            email=f"{owner.lower().replace(' ', '.')}@example.com",
                            amount_due=2500.0,
                            status="Paid" if is_paid else "Unpaid"
                        )
                        db.session.add(res)
                        
                        if is_paid:
                            pmt = Payment(
                                id=f"TX-{random.randint(100000, 999999)}",
                                flat_id=flat_id,
                                amount_paid=2500.0,
                                payment_date=datetime.utcnow(),
                                transaction_id=f"UPI{random.randint(100000000000, 999999999999)}",
                                method=random.choice(["GPay", "PhonePe", "Paytm", "UPI"]),
                                notes="Seeded automatic verification"
                            )
                            db.session.add(pmt)
            db.session.commit()
            
    app.run(host='0.0.0.0', port=5000, debug=True)
