"""
Fees seed data helper — imported by database.py
"""
import json


def seed_fees_data(conn):
    """Seed realistic fee structures and student fee records for testing."""
    cursor = conn.cursor()

    # 1. Fee Structures
    structures = [
        # CSE Semester 6, 2025-2026
        ("Computer Science & Engineering", 6, "2025-2026", "Tuition Fees",
         45000.00, "2026-08-15",
         "Covers academic instruction, lab facilities, and departmental resources.", 1, 1),
        ("Computer Science & Engineering", 6, "2025-2026", "Examination Fees",
         2500.00, "2026-10-01",
         "University examination registration, hall ticket processing, and result publication.", 1, 1),
        ("Computer Science & Engineering", 6, "2025-2026", "Transportation Fees",
         8000.00, "2026-08-15",
         "Campus shuttle bus service for the full academic semester.", 1, 1),
        ("Computer Science & Engineering", 6, "2025-2026", "Hostel Fees",
         18000.00, "2026-08-15",
         "Residential accommodation, utilities, and hostel administration.", 1, 1),
        # CSE Semester 5, 2025-2026 (historical)
        ("Computer Science & Engineering", 5, "2025-2026", "Tuition Fees",
         45000.00, "2026-01-15", "Tuition fees for Semester 5.", 1, 1),
        ("Computer Science & Engineering", 5, "2025-2026", "Examination Fees",
         2500.00, "2026-03-01", "Examination fees for Semester 5.", 1, 1),
        ("Computer Science & Engineering", 5, "2025-2026", "Transportation Fees",
         8000.00, "2026-01-15", "Transport fees for Semester 5.", 1, 1),
        ("Computer Science & Engineering", 5, "2025-2026", "Hostel Fees",
         18000.00, "2026-01-15", "Hostel fees for Semester 5.", 1, 1),
        # ECE Semester 6, 2025-2026
        ("Electronics & Communication Engineering", 6, "2025-2026", "Tuition Fees",
         42000.00, "2026-08-15", "Tuition fees for ECE Semester 6.", 1, 1),
        ("Electronics & Communication Engineering", 6, "2025-2026", "Examination Fees",
         2500.00, "2026-10-01", "Examination fees for ECE Semester 6.", 1, 1),
        ("Electronics & Communication Engineering", 6, "2025-2026", "Transportation Fees",
         8000.00, "2026-08-15", "Transport fees for ECE Semester 6.", 1, 1),
        ("Electronics & Communication Engineering", 6, "2025-2026", "Hostel Fees",
         18000.00, "2026-08-15", "Hostel fees for ECE Semester 6.", 1, 1),
    ]
    cursor.executemany("""
    INSERT OR IGNORE INTO fee_structures
    (department, semester, academic_year, fee_category, total_amount, due_date,
     description, is_active, partial_payment_allowed)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, structures)

    # 2. Student Fee Records for Alex Kumar
    cursor.execute("""
        SELECT id, fee_category, total_amount FROM fee_structures
        WHERE department = 'Computer Science & Engineering'
        AND semester = 6 AND academic_year = '2025-2026'
    """)
    sem6_structures = cursor.fetchall()

    cursor.execute("""
        SELECT id, fee_category, total_amount FROM fee_structures
        WHERE department = 'Computer Science & Engineering'
        AND semester = 5 AND academic_year = '2025-2026'
    """)
    sem5_structures = cursor.fetchall()

    sem6_records = []
    for s in sem6_structures:
        fs_id, category, total = s['id'], s['fee_category'], s['total_amount']
        if category == "Tuition Fees":
            paid, status = 30000.00, "Partial"
        elif category == "Examination Fees":
            paid, status = 2500.00, "Paid"
        elif category == "Transportation Fees":
            paid, status = 0.00, "Pending"
        else:
            paid, status = 0.00, "Pending"
        outstanding = round(total - paid, 2)
        sem6_records.append((
            1, "1MS21CS084", "Alex Kumar",
            "Computer Science & Engineering", 6, "2025-2026",
            fs_id, category, total, paid, outstanding, status
        ))

    sem5_records = []
    for s in sem5_structures:
        fs_id, category, total = s['id'], s['fee_category'], s['total_amount']
        sem5_records.append((
            1, "1MS21CS084", "Alex Kumar",
            "Computer Science & Engineering", 5, "2025-2026",
            fs_id, category, total, total, 0.0, "Paid"
        ))

    all_records = sem6_records + sem5_records
    cursor.executemany("""
    INSERT OR IGNORE INTO student_fee_records
    (student_id, usn, student_name, department, semester, academic_year,
     fee_structure_id, fee_category, total_amount, amount_paid, outstanding_amount, payment_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, all_records)

    # 3. Fee Transactions
    transactions = [
        ("TXN-2026-001", 1, "1MS21CS084", "Alex Kumar",
         45000.00, "Net Banking", "Successful", "HDFC-REF-2025-4521", "2026-01-14",
         "RCP-2026-001", json.dumps({"Tuition Fees": 45000.0}), "Tuition Fees",
         "2025-2026", 5, "Semester 5 Tuition Fees paid via HDFC Net Banking."),
        ("TXN-2026-002", 1, "1MS21CS084", "Alex Kumar",
         2500.00, "UPI", "Successful", "UPI-REF-2026-8832", "2026-01-20",
         "RCP-2026-002", json.dumps({"Examination Fees": 2500.0}), "Examination Fees",
         "2025-2026", 5, "Semester 5 Examination Fees paid via UPI."),
        ("TXN-2026-003", 1, "1MS21CS084", "Alex Kumar",
         8000.00, "Debit Card", "Successful", "AXIS-REF-2026-3391", "2026-01-14",
         "RCP-2026-003", json.dumps({"Transportation Fees": 8000.0}), "Transportation Fees",
         "2025-2026", 5, "Semester 5 Transport Fees via Axis Debit Card."),
        ("TXN-2026-004", 1, "1MS21CS084", "Alex Kumar",
         18000.00, "Net Banking", "Successful", "SBI-REF-2026-7712", "2026-01-14",
         "RCP-2026-004", json.dumps({"Hostel Fees": 18000.0}), "Hostel Fees",
         "2025-2026", 5, "Semester 5 Hostel Fees paid via SBI Net Banking."),
        ("TXN-2026-005", 1, "1MS21CS084", "Alex Kumar",
         30000.00, "Net Banking", "Successful", "HDFC-REF-2026-9923", "2026-08-10",
         "RCP-2026-005", json.dumps({"Tuition Fees": 30000.0}), "Tuition Fees",
         "2025-2026", 6, "Semester 6 Tuition Fees (partial payment) via HDFC Net Banking."),
        ("TXN-2026-006", 1, "1MS21CS084", "Alex Kumar",
         2500.00, "UPI", "Successful", "UPI-REF-2026-5541", "2026-10-02",
         "RCP-2026-006", json.dumps({"Examination Fees": 2500.0}), "Examination Fees",
         "2025-2026", 6, "Semester 6 Examination Fees paid via PhonePe UPI."),
        ("TXN-2026-007", 1, "1MS21CS084", "Alex Kumar",
         15000.00, "Credit Card", "Failed", "", "2026-10-15",
         None, json.dumps({"Tuition Fees": 15000.0}), "Tuition Fees",
         "2025-2026", 6, "Payment failed: Credit card authorization declined by gateway. No amount debited."),
    ]
    cursor.executemany("""
    INSERT OR IGNORE INTO fee_transactions
    (transaction_id, student_id, usn, student_name, payment_amount, payment_method,
     payment_status, gateway_reference, payment_date, receipt_number, payment_breakdown,
     fee_categories, academic_year, semester, remarks)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, transactions)

    # 4. Scholarships
    scholarships = [
        ("Dr. Rajendra Prasad Merit Scholarship",
         "Awarded to top-performing students in the Department of Computer Science & Engineering.",
         "Minimum CGPA of 9.0; Must be enrolled full-time; No active backlogs.",
         25000.00, "Merit", "Computer Science & Engineering", 9.0, 0.0,
         "2025-2026", "2026-09-30", 1),
        ("Government Post-Matric Scholarship",
         "State government scholarship for students from economically weaker sections.",
         "Annual family income below Rs. 2,50,000; SC/ST/OBC category certificate required.",
         45000.00, "Government", "All", 0.0, 250000.0,
         "2025-2026", "2026-10-15", 1),
        ("Sports Excellence Scholarship",
         "Awarded to students who have represented the institution in inter-collegiate sports.",
         "Certificate of inter-collegiate sports participation required; Minimum 60% attendance.",
         12000.00, "Sports", "All", 0.0, 0.0,
         "2025-2026", "2026-09-15", 1),
        ("Women in Technology Scholarship",
         "Scholarship encouraging female students in technical engineering programs.",
         "Female students in engineering; Minimum CGPA of 7.5.",
         20000.00, "Merit", "All", 7.5, 0.0,
         "2025-2026", "2026-10-31", 1),
    ]
    cursor.executemany("""
    INSERT OR IGNORE INTO scholarships
    (name, description, eligibility_criteria, max_amount, scholarship_type, applicable_departments,
     min_cgpa, max_family_income, academic_year, application_deadline, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, scholarships)

    # 5. Scholarship Application — Alex Kumar
    cursor.execute("SELECT id FROM scholarships WHERE name = 'Dr. Rajendra Prasad Merit Scholarship'")
    row = cursor.fetchone()
    if row:
        merit_id = row[0]
        cursor.execute("""
        INSERT OR IGNORE INTO scholarship_applications
        (scholarship_id, student_id, usn, student_name, department, semester, cgpa,
         application_text, supporting_document, status, approved_amount, admin_remarks,
         submitted_at, reviewed_at)
        VALUES (?, 1, '1MS21CS084', 'Alex Kumar', 'Computer Science & Engineering', 6, 9.12,
         'I am applying for the Dr. Rajendra Prasad Merit Scholarship based on my consistently strong academic performance across 5 completed semesters, maintaining a CGPA of 9.12. I have contributed as Technical Coordinator of the CSE Open Source Society and secured First Runner-Up at the National Smart Campus Hackathon. This scholarship would help offset my outstanding Tuition Fee balance.',
         '', 'Under Review', 0.0,
         'Application under academic verification. Marks sheets for all 5 semesters requested from Records Office.',
         '2026-09-18 10:30:00', '2026-09-25 14:00:00')
        """, (merit_id,))

    conn.commit()
