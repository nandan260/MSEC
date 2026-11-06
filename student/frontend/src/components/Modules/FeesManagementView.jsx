import React, { useState, useEffect, useCallback } from 'react';
import { apiUrl } from '../../api';

const BASE = apiUrl('/api');

// ─── helpers ────────────────────────────────────────────────────────────────
function fmt(n) {
  if (n === null || n === undefined) return '0.00';
  return Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(s) {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d)) return s;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function statusClass(status) {
  if (!status) return 'status-pill status-neutral';
  const s = status.toLowerCase();
  if (s === 'paid' || s === 'successful' || s === 'approved') return 'status-pill status-success';
  if (s === 'partial') return 'status-pill status-warning';
  if (s === 'failed' || s === 'rejected') return 'status-pill status-danger';
  return 'status-pill status-neutral';
}

// ─── Tab bar ────────────────────────────────────────────────────────────────
function TabBar({ tabs, active, onSelect }) {
  return (
    <div className="auth-tabs" style={{ marginBottom: '18px' }}>
      {tabs.map(t => (
        <button
          key={t.id}
          type="button"
          className={`auth-tab${active === t.id ? ' active' : ''}`}
          onClick={() => onSelect(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ─── Alert ──────────────────────────────────────────────────────────────────
function Alert({ type, msg }) {
  if (!msg) return null;
  return <div className={`alert-box alert-${type}`}>{msg}</div>;
}

// ─── Modal ──────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        background: '#fff', borderRadius: '8px', padding: '24px',
        width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 4px 24px rgba(0,0,0,0.18)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', color: '#1e3a8a' }}>{title}</h3>
          <button type="button" className="btn-secondary" onClick={onClose} style={{ padding: '4px 10px' }}>Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── DemoNotice ─────────────────────────────────────────────────────────────
function DemoNotice() {
  return (
    <div style={{
      border: '1.5px solid #f59e0b', background: '#fffbeb', borderRadius: '6px',
      padding: '10px 14px', fontSize: '13px', color: '#92400e', marginBottom: '16px'
    }}>
      <strong>DEMO PAYMENT MODE:</strong> This is a demonstration only. No real financial transaction
      will occur. Card details entered here are not stored or transmitted to any payment gateway.
    </div>
  );
}

// ─── StatCard ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{sub}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 1 — Fee Details
// ═══════════════════════════════════════════════════════════════════════════
function FeeDetailsTab({ studentId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [semester, setSemester] = useState(6);
  const [academicYear, setAcademicYear] = useState('2025-2026');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    fetch(`${BASE}/fees/student-details?student_id=${studentId}&semester=${semester}&academic_year=${academicYear}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); setData(null); }
        else setData(d);
      })
      .catch(() => setError('Failed to load fee details.'))
      .finally(() => setLoading(false));
  }, [studentId, semester, academicYear]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="loading-text">Loading fee details...</div>;
  if (error) return <Alert type="danger" msg={error} />;
  if (!data) return null;

  const { student, summary, fee_records, available_semesters } = data;

  return (
    <div>
      {/* Student Banner */}
      <div className="banner-card" style={{ marginBottom: '18px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#1e3a8a' }}>{student.name}</div>
            <div style={{ fontSize: '13px', color: '#374151', marginTop: '2px' }}>USN: {student.usn}</div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '18px', fontSize: '13px', color: '#374151' }}>
            <span>Department: <strong>{student.department}</strong></span>
            <span>Semester: <strong>{student.current_semester}</strong></span>
            <span>Academic Year: <strong>{student.academic_year}</strong></span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <label style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>Semester:</label>
        <select
          className="form-select"
          style={{ width: '120px' }}
          value={semester}
          onChange={e => setSemester(Number(e.target.value))}
        >
          {(available_semesters || [1,2,3,4,5,6,7,8]).map(s => (
            <option key={s} value={s}>Semester {s}</option>
          ))}
        </select>
        <label style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>Academic Year:</label>
        <select
          className="form-select"
          style={{ width: '140px' }}
          value={academicYear}
          onChange={e => setAcademicYear(e.target.value)}
        >
          {['2024-2025', '2025-2026', '2026-2027'].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="stats-grid" style={{ marginBottom: '18px' }}>
          <StatCard label="Total Payable" value={`Rs. ${fmt(summary.total_payable)}`} />
          <StatCard label="Amount Paid" value={`Rs. ${fmt(summary.total_paid)}`} />
          <StatCard label="Outstanding Balance" value={`Rs. ${fmt(summary.total_outstanding)}`} />
        </div>
      )}

      {/* Fee Records Table */}
      <div className="panel-card">
        <div className="panel-card-header">
          Fee Structure — Semester {semester} ({academicYear})
        </div>
        <div className="panel-card-body table-responsive">
          {fee_records && fee_records.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fee Category</th>
                  <th>Total Amount (Rs.)</th>
                  <th>Amount Paid (Rs.)</th>
                  <th>Outstanding (Rs.)</th>
                  <th>Due Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {fee_records.map((rec, i) => (
                  <tr key={i}>
                    <td>{rec.fee_category}</td>
                    <td>{fmt(rec.total_amount)}</td>
                    <td>{fmt(rec.amount_paid)}</td>
                    <td>{fmt(rec.outstanding_amount)}</td>
                    <td>{fmtDate(rec.due_date)}</td>
                    <td><span className={statusClass(rec.payment_status)}>{rec.payment_status}</span></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 700, background: '#f1f5f9' }}>
                  <td>Total</td>
                  <td>{fmt(summary?.total_payable)}</td>
                  <td>{fmt(summary?.total_paid)}</td>
                  <td>{fmt(summary?.total_outstanding)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          ) : (
            <p style={{ color: '#6b7280', fontSize: '13px' }}>
              No fee records found for Semester {semester} ({academicYear}).
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 2 — Make Payment
// ═══════════════════════════════════════════════════════════════════════════
function MakePaymentTab({ studentId }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [semester, setSemester] = useState(6);
  const [academicYear] = useState('2025-2026');

  const [selectedIds, setSelectedIds] = useState([]);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('UPI');

  // Payment flow states: 'select' | 'confirm' | 'success' | 'failed'
  const [stage, setStage] = useState('select');
  const [orderInfo, setOrderInfo] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [processing, setProcessing] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    setStage('select');
    setSelectedIds([]);
    setPayAmount('');
    setOrderInfo(null);
    setReceipt(null);
    fetch(`${BASE}/fees/student-details?student_id=${studentId}&semester=${semester}&academic_year=${academicYear}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError('Failed to load fee data.'))
      .finally(() => setLoading(false));
  }, [studentId, semester, academicYear]);

  useEffect(() => { load(); }, [load]);

  const unpaidRecords = (data?.fee_records || []).filter(r => r.payment_status !== 'Paid');

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      const sum = unpaidRecords
        .filter(r => next.includes(r.id))
        .reduce((acc, r) => acc + Number(r.outstanding_amount), 0);
      setPayAmount(sum.toFixed(2));
      return next;
    });
  };

  const handleInitiate = () => {
    if (selectedIds.length === 0) { setError('Select at least one fee component.'); return; }
    if (!payAmount || Number(payAmount) <= 0) { setError('Enter a valid payment amount.'); return; }
    setError('');
    setProcessing(true);
    fetch(`${BASE}/fees/payment/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: studentId,
        semester,
        academic_year: academicYear,
        selected_record_ids: selectedIds,
        payment_amount: Number(payAmount),
        payment_method: payMethod
      })
    })
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else { setOrderInfo(d); setStage('confirm'); }
      })
      .catch(() => setError('Payment initiation failed.'))
      .finally(() => setProcessing(false));
  };

  const handleConfirm = (simulate_failure = false) => {
    setProcessing(true);
    fetch(`${BASE}/fees/payment/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transaction_id: orderInfo.transaction_id,
        selected_record_ids: selectedIds,
        payment_amount: Number(payAmount),
        simulate_failure
      })
    })
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else if (d.status === 'Failed') { setReceipt(d); setStage('failed'); }
        else { setReceipt(d); setStage('success'); }
      })
      .catch(() => setError('Payment confirmation failed.'))
      .finally(() => setProcessing(false));
  };

  const printReceipt = () => {
    const prev = document.title;
    document.title = `Fee_Receipt_${receipt?.receipt_number || 'DEMO'}`;
    window.print();
    document.title = prev;
  };

  if (loading) return <div className="loading-text">Loading payment details...</div>;

  return (
    <div>
      <DemoNotice />
      <Alert type="danger" msg={error} />

      {/* Semester selector */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
        <label style={{ fontSize: '13px', fontWeight: 500 }}>Semester:</label>
        <select className="form-select" style={{ width: '120px' }} value={semester}
          onChange={e => { setSemester(Number(e.target.value)); }}>
          {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
        </select>
        <button type="button" className="btn-secondary" onClick={load} style={{ fontSize: '12px' }}>Refresh</button>
      </div>

      {/* Outstanding balance banner */}
      {data?.summary && (
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '12px 16px', marginBottom: '16px', fontSize: '14px', color: '#1e3a8a' }}>
          Outstanding Balance for Semester {semester}: <strong>Rs. {fmt(data.summary.total_outstanding)}</strong>
        </div>
      )}

      {/* STAGE: select */}
      {stage === 'select' && (
        <div>
          {unpaidRecords.length === 0 ? (
            <div className="panel-card">
              <div className="panel-card-body">
                <p style={{ color: '#16a34a', fontWeight: 500 }}>All fees for Semester {semester} are paid.</p>
              </div>
            </div>
          ) : (
            <div className="panel-card">
              <div className="panel-card-header">Select Fee Components to Pay</div>
              <div className="panel-card-body">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Select</th>
                      <th>Fee Category</th>
                      <th>Total (Rs.)</th>
                      <th>Paid (Rs.)</th>
                      <th>Outstanding (Rs.)</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unpaidRecords.map(rec => (
                      <tr key={rec.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(rec.id)}
                            onChange={() => toggleSelect(rec.id)}
                          />
                        </td>
                        <td>{rec.fee_category}</td>
                        <td>{fmt(rec.total_amount)}</td>
                        <td>{fmt(rec.amount_paid)}</td>
                        <td>{fmt(rec.outstanding_amount)}</td>
                        <td><span className={statusClass(rec.payment_status)}>{rec.payment_status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ marginTop: '18px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
                  <div>
                    <label className="form-label">Payment Amount (Rs.)</label>
                    <input
                      type="number"
                      className="form-input"
                      style={{ width: '180px' }}
                      value={payAmount}
                      min="1"
                      onChange={e => setPayAmount(e.target.value)}
                      placeholder="Enter amount"
                    />
                    <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '3px' }}>
                      You may reduce for partial payment if allowed.
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Payment Method</label>
                    <select className="form-select" style={{ width: '160px' }} value={payMethod}
                      onChange={e => setPayMethod(e.target.value)}>
                      <option value="UPI">UPI</option>
                      <option value="Debit Card">Debit Card</option>
                      <option value="Credit Card">Credit Card</option>
                      <option value="Net Banking">Net Banking</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginTop: '16px' }}>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleInitiate}
                    disabled={processing || selectedIds.length === 0}
                  >
                    {processing ? 'Processing...' : 'Proceed to Payment'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STAGE: confirm */}
      {stage === 'confirm' && orderInfo && (
        <div className="panel-card">
          <div className="panel-card-header">Confirm Payment</div>
          <div className="panel-card-body">
            <DemoNotice />
            <table className="data-table" style={{ marginBottom: '16px' }}>
              <tbody>
                <tr><td><strong>Order ID</strong></td><td>{orderInfo.order_id}</td></tr>
                <tr><td><strong>Transaction ID</strong></td><td>{orderInfo.transaction_id}</td></tr>
                <tr><td><strong>Amount</strong></td><td>Rs. {fmt(orderInfo.payment_amount)}</td></tr>
                <tr><td><strong>Method</strong></td><td>{orderInfo.payment_method}</td></tr>
                <tr><td><strong>Components</strong></td><td>{orderInfo.fee_categories}</td></tr>
                <tr><td><strong>Semester</strong></td><td>Semester {semester} ({academicYear})</td></tr>
              </tbody>
            </table>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button type="button" className="btn-primary"
                disabled={processing} onClick={() => handleConfirm(false)}>
                {processing ? 'Processing...' : 'Confirm and Complete Demo Payment'}
              </button>
              <button type="button" className="btn-secondary"
                disabled={processing} onClick={() => handleConfirm(true)}>
                Simulate Failed Payment
              </button>
              <button type="button" className="btn-secondary"
                onClick={() => { setStage('select'); setOrderInfo(null); }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STAGE: success */}
      {stage === 'success' && receipt && (
        <div className="panel-card">
          <div className="panel-card-header">Payment Successful</div>
          <div className="panel-card-body">
            <div className="alert-box alert-success" style={{ marginBottom: '16px' }}>
              Payment completed. Receipt number: <strong>{receipt.receipt_number}</strong>
            </div>
            <table className="data-table" style={{ marginBottom: '16px' }}>
              <tbody>
                <tr><td><strong>Receipt Number</strong></td><td>{receipt.receipt_number}</td></tr>
                <tr><td><strong>Transaction ID</strong></td><td>{receipt.transaction_id}</td></tr>
                <tr><td><strong>Gateway Reference</strong></td><td>{receipt.gateway_reference}</td></tr>
                <tr><td><strong>Amount Paid</strong></td><td>Rs. {fmt(receipt.payment_amount)}</td></tr>
                <tr><td><strong>Method</strong></td><td>{receipt.payment_method}</td></tr>
                <tr><td><strong>Date</strong></td><td>{fmtDate(receipt.payment_date)}</td></tr>
              </tbody>
            </table>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" className="btn-primary" onClick={printReceipt}>
                Download Receipt (Print)
              </button>
              <button type="button" className="btn-secondary" onClick={load}>
                Make Another Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STAGE: failed */}
      {stage === 'failed' && (
        <div className="panel-card">
          <div className="panel-card-header">Payment Failed</div>
          <div className="panel-card-body">
            <Alert type="danger" msg={receipt?.message || 'Payment failed. No amount was deducted.'} />
            <button type="button" className="btn-secondary" onClick={load} style={{ marginTop: '12px' }}>
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 3 — Payment History
// ═══════════════════════════════════════════════════════════════════════════
function PaymentHistoryTab({ studentId, userRole }) {
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${BASE}/fees/transactions?student_id=${studentId}&role=${userRole}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setTxns(Array.isArray(d) ? d : []);
      })
      .catch(() => setError('Failed to load transaction history.'))
      .finally(() => setLoading(false));
  }, [studentId, userRole]);

  const printReceipt = (txn) => {
    const prev = document.title;
    document.title = `Fee_Receipt_${txn.receipt_number}`;
    // Build a simple print content
    const win = window.open('', '_blank', 'width=700,height=600');
    win.document.write(`
      <html><head><title>Fee Receipt - ${txn.receipt_number}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 32px; color: #111; }
        h2 { color: #1e3a8a; } table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        td, th { border: 1px solid #cbd5e1; padding: 8px 12px; font-size: 13px; }
        th { background: #f1f5f9; text-align: left; }
        .footer { margin-top: 32px; font-size: 12px; color: #6b7280; }
      </style></head><body>
      <h2>College Student Management Portal</h2>
      <h3>Fee Payment Receipt</h3>
      <table>
        <tr><th>Receipt Number</th><td>${txn.receipt_number}</td></tr>
        <tr><th>Transaction ID</th><td>${txn.transaction_id}</td></tr>
        <tr><th>Date</th><td>${fmtDate(txn.payment_date)}</td></tr>
        <tr><th>Amount Paid</th><td>Rs. ${fmt(txn.payment_amount)}</td></tr>
        <tr><th>Payment Method</th><td>${txn.payment_method}</td></tr>
        <tr><th>Fee Categories</th><td>${txn.fee_categories || '—'}</td></tr>
        <tr><th>Semester</th><td>Semester ${txn.semester} (${txn.academic_year})</td></tr>
        <tr><th>Gateway Reference</th><td>${txn.gateway_reference || '—'}</td></tr>
        <tr><th>Status</th><td>${txn.payment_status}</td></tr>
      </table>
      <div class="footer">This is a demo receipt generated by the College Student Management Portal. Not a valid financial document.</div>
      </body></html>
    `);
    win.document.close();
    win.print();
    document.title = prev;
  };

  if (loading) return <div className="loading-text">Loading payment history...</div>;

  return (
    <div>
      <Alert type="danger" msg={error} />
      <div className="panel-card">
        <div className="panel-card-header">Payment History</div>
        <div className="panel-card-body table-responsive">
          {txns.length === 0 ? (
            <p style={{ color: '#6b7280', fontSize: '13px' }}>No payment transactions found.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Date</th>
                  <th>Amount (Rs.)</th>
                  <th>Method</th>
                  <th>Categories</th>
                  <th>Semester</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {txns.map(txn => (
                  <tr key={txn.transaction_id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                      {txn.transaction_id?.slice(0, 16)}...
                    </td>
                    <td>{fmtDate(txn.payment_date)}</td>
                    <td>{fmt(txn.payment_amount)}</td>
                    <td>{txn.payment_method}</td>
                    <td>{txn.fee_categories || '—'}</td>
                    <td>Sem {txn.semester}</td>
                    <td><span className={statusClass(txn.payment_status)}>{txn.payment_status}</span></td>
                    <td>
                      {txn.payment_status === 'Successful' && txn.receipt_number ? (
                        <button type="button" className="btn-secondary"
                          style={{ fontSize: '11px', padding: '3px 8px' }}
                          onClick={() => printReceipt(txn)}>
                          Receipt
                        </button>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 4 — Scholarships
// ═══════════════════════════════════════════════════════════════════════════
function ScholarshipsTab({ studentId, userRole }) {
  const [scholarships, setScholarships] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [applyModal, setApplyModal] = useState(null); // scholarship object
  const [appText, setAppText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`${BASE}/fees/scholarships`).then(r => r.json()),
      fetch(`${BASE}/fees/scholarship-applications?student_id=${studentId}&role=${userRole}`).then(r => r.json())
    ])
      .then(([sc, ap]) => {
        setScholarships(Array.isArray(sc) ? sc : []);
        setApplications(Array.isArray(ap) ? ap : []);
      })
      .catch(() => setError('Failed to load scholarship data.'))
      .finally(() => setLoading(false));
  }, [studentId, userRole]);

  useEffect(() => { load(); }, [load]);

  const handleApply = () => {
    if (!appText.trim()) { setError('Please provide an application note.'); return; }
    setSubmitting(true);
    fetch(`${BASE}/fees/scholarship-applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: studentId,
        scholarship_id: applyModal.id,
        application_text: appText
      })
    })
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else { setSuccess('Application submitted successfully.'); setApplyModal(null); setAppText(''); load(); }
      })
      .catch(() => setError('Failed to submit application.'))
      .finally(() => setSubmitting(false));
  };

  const alreadyApplied = (schId) => applications.some(a => a.scholarship_id === schId);

  if (loading) return <div className="loading-text">Loading scholarships...</div>;

  return (
    <div>
      <Alert type="danger" msg={error} />
      <Alert type="success" msg={success} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
        {/* Available Scholarships */}
        <div className="panel-card">
          <div className="panel-card-header">Available Scholarships</div>
          <div className="panel-card-body">
            {scholarships.length === 0 ? (
              <p style={{ color: '#6b7280', fontSize: '13px' }}>No active scholarships at this time.</p>
            ) : scholarships.map(sc => (
              <div key={sc.id} style={{
                border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px',
                marginBottom: '12px', background: '#f8fafc'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e3a8a' }}>{sc.name}</div>
                  <span className="status-pill status-neutral" style={{ fontSize: '10px' }}>{sc.scholarship_type}</span>
                </div>
                <div style={{ fontSize: '12px', color: '#374151', marginBottom: '4px' }}>
                  Max Award: <strong>Rs. {fmt(sc.max_amount)}</strong>
                </div>
                {sc.min_cgpa && (
                  <div style={{ fontSize: '12px', color: '#374151', marginBottom: '4px' }}>
                    Min CGPA: <strong>{sc.min_cgpa}</strong>
                  </div>
                )}
                {sc.max_family_income && (
                  <div style={{ fontSize: '12px', color: '#374151', marginBottom: '4px' }}>
                    Max Family Income: <strong>Rs. {fmt(sc.max_family_income)}</strong>
                  </div>
                )}
                {sc.deadline && (
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
                    Deadline: {fmtDate(sc.deadline)}
                  </div>
                )}
                {sc.eligibility_criteria && (
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
                    {sc.eligibility_criteria}
                  </div>
                )}
                {userRole === 'student' && (
                  <button
                    type="button"
                    className={alreadyApplied(sc.id) ? 'btn-secondary' : 'btn-primary'}
                    style={{ fontSize: '12px', padding: '4px 10px' }}
                    disabled={alreadyApplied(sc.id)}
                    onClick={() => { setApplyModal(sc); setAppText(''); setError(''); setSuccess(''); }}
                  >
                    {alreadyApplied(sc.id) ? 'Applied' : 'Apply Now'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* My Applications */}
        <div className="panel-card">
          <div className="panel-card-header">My Applications</div>
          <div className="panel-card-body table-responsive">
            {applications.length === 0 ? (
              <p style={{ color: '#6b7280', fontSize: '13px' }}>No scholarship applications yet.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Scholarship</th>
                    <th>Applied On</th>
                    <th>Status</th>
                    <th>Approved (Rs.)</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map(ap => (
                    <tr key={ap.id}>
                      <td>{ap.scholarship_name}</td>
                      <td>{fmtDate(ap.application_date)}</td>
                      <td><span className={statusClass(ap.status)}>{ap.status}</span></td>
                      <td>{ap.approved_amount ? fmt(ap.approved_amount) : '—'}</td>
                      <td style={{ fontSize: '12px' }}>{ap.admin_remarks || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Apply Modal */}
      {applyModal && (
        <Modal title={`Apply for ${applyModal.name}`} onClose={() => setApplyModal(null)}>
          <Alert type="danger" msg={error} />
          <div style={{ marginBottom: '12px', fontSize: '13px', color: '#374151' }}>
            <strong>Max Award:</strong> Rs. {fmt(applyModal.max_amount)}<br />
            <strong>Deadline:</strong> {fmtDate(applyModal.deadline)}
          </div>
          <div className="form-group">
            <label className="form-label">Application Note / Statement</label>
            <textarea
              className="form-input"
              rows={5}
              value={appText}
              onChange={e => setAppText(e.target.value)}
              placeholder="Briefly describe why you are applying for this scholarship..."
              style={{ resize: 'vertical' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
            <button type="button" className="btn-primary" onClick={handleApply} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Application'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setApplyModal(null)}>Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 5 — Fee Report
// ═══════════════════════════════════════════════════════════════════════════
function FeeReportTab({ studentId }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [academicYear] = useState('2025-2026');

  useEffect(() => {
    fetch(`${BASE}/fees/report?student_id=${studentId}&academic_year=${academicYear}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setReport(d);
      })
      .catch(() => setError('Failed to load fee report.'))
      .finally(() => setLoading(false));
  }, [studentId, academicYear]);

  const downloadReport = () => {
    const prev = document.title;
    document.title = `Fee_Statement_${report?.student?.usn || 'Student'}_${academicYear}`;
    window.print();
    document.title = prev;
  };

  if (loading) return <div className="loading-text">Generating fee report...</div>;
  if (error) return <Alert type="danger" msg={error} />;
  if (!report) return null;

  const {
    student,
    semester_summary = [],
    category_breakdown = [],
    transactions = [],
    scholarships = [],
    totals = {}
  } = report;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '15px', color: '#1e3a8a' }}>
          Fee Statement — {academicYear}
        </h3>
        <button type="button" className="btn-primary" onClick={downloadReport}>
          Download Statement (Print)
        </button>
      </div>

      {/* Student info */}
      <div className="banner-card" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', fontSize: '13px', color: '#374151' }}>
          <span><strong>Name:</strong> {student?.name || 'Alex Kumar'}</span>
          <span><strong>USN:</strong> {student?.usn || '1MS21CS084'}</span>
          <span><strong>Department:</strong> {student?.department || 'Computer Science & Engineering'}</span>
          <span><strong>Academic Year:</strong> {academicYear}</span>
        </div>
      </div>

      {/* Overall summary */}
      {totals && (
        <div className="stats-grid" style={{ marginBottom: '18px' }}>
          <StatCard label="Total Payable" value={`Rs. ${fmt(totals.payable)}`} />
          <StatCard label="Total Paid" value={`Rs. ${fmt(totals.paid)}`} />
          <StatCard label="Total Outstanding" value={`Rs. ${fmt(totals.outstanding)}`} />
          <StatCard label="Scholarships Applied" value={scholarships.length} />
        </div>
      )}

      {/* Semester-wise summary */}
      {semester_summary && semester_summary.length > 0 && (
        <div className="panel-card" style={{ marginBottom: '16px' }}>
          <div className="panel-card-header">Semester-wise Summary</div>
          <div className="panel-card-body table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Semester</th>
                  <th>Total Payable (Rs.)</th>
                  <th>Amount Paid (Rs.)</th>
                  <th>Outstanding (Rs.)</th>
                </tr>
              </thead>
              <tbody>
                {semester_summary.map((s, i) => (
                  <tr key={i}>
                    <td>Semester {s.semester}</td>
                    <td>{fmt(s.payable)}</td>
                    <td>{fmt(s.paid)}</td>
                    <td>{fmt(s.outstanding)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Category-wise */}
      {category_breakdown && category_breakdown.length > 0 && (
        <div className="panel-card" style={{ marginBottom: '16px' }}>
          <div className="panel-card-header">Category-wise Breakdown</div>
          <div className="panel-card-body table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fee Category</th>
                  <th>Total Payable (Rs.)</th>
                  <th>Total Paid (Rs.)</th>
                  <th>Outstanding (Rs.)</th>
                </tr>
              </thead>
              <tbody>
                {category_breakdown.map((c, i) => (
                  <tr key={i}>
                    <td>{c.fee_category}</td>
                    <td>{fmt(c.payable)}</td>
                    <td>{fmt(c.paid)}</td>
                    <td>{fmt(c.outstanding)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Scholarship concessions */}
      {scholarships && scholarships.length > 0 && (
        <div className="panel-card" style={{ marginBottom: '16px' }}>
          <div className="panel-card-header">Scholarship Concessions</div>
          <div className="panel-card-body table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Scholarship</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Approved Amount (Rs.)</th>
                </tr>
              </thead>
              <tbody>
                {scholarships.map((sc, i) => (
                  <tr key={i}>
                    <td>{sc.scholarship_name}</td>
                    <td>{sc.scholarship_type}</td>
                    <td><span className={statusClass(sc.status)}>{sc.status}</span></td>
                    <td>{sc.approved_amount ? fmt(sc.approved_amount) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      {transactions && transactions.length > 0 && (
        <div className="panel-card">
          <div className="panel-card-header">Payment History</div>
          <div className="panel-card-body table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount (Rs.)</th>
                  <th>Method</th>
                  <th>Categories</th>
                  <th>Semester</th>
                  <th>Status</th>
                  <th>Receipt No.</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn, i) => (
                  <tr key={i}>
                    <td>{fmtDate(txn.payment_date)}</td>
                    <td>{fmt(txn.payment_amount)}</td>
                    <td>{txn.payment_method}</td>
                    <td>{txn.fee_categories || '—'}</td>
                    <td>Sem {txn.semester}</td>
                    <td><span className={statusClass(txn.payment_status)}>{txn.payment_status}</span></td>
                    <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{txn.receipt_number || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 6 — Admin Dashboard
// ═══════════════════════════════════════════════════════════════════════════
function AdminDashboardTab() {
  const [overview, setOverview] = useState(null);
  const [structures, setStructures] = useState([]);
  const [scholarshipApps, setScholarshipApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [academicYear] = useState('2025-2026');

  const [addModal, setAddModal] = useState(false);
  const [reviewModal, setReviewModal] = useState(null);
  const [form, setForm] = useState({
    department: 'Computer Science & Engineering',
    semester: 6,
    academic_year: '2025-2026',
    fee_category: 'Tuition Fees',
    total_amount: '',
    due_date: '',
    partial_payment_allowed: 0
  });
  const [reviewForm, setReviewForm] = useState({ status: 'Approved', approved_amount: '', admin_remarks: '' });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`${BASE}/fees/admin/overview?academic_year=${academicYear}`).then(r => r.json()),
      fetch(`${BASE}/fees/structures?academic_year=${academicYear}`).then(r => r.json()),
      fetch(`${BASE}/fees/scholarship-applications?role=admin`).then(r => r.json())
    ])
      .then(([ov, st, ap]) => {
        setOverview(ov.error ? null : ov);
        setStructures(Array.isArray(st) ? st : []);
        setScholarshipApps(Array.isArray(ap) ? ap : []);
      })
      .catch(() => setError('Failed to load admin data.'))
      .finally(() => setLoading(false));
  }, [academicYear]);

  useEffect(() => { load(); }, [load]);

  const handleAddStructure = () => {
    if (!form.total_amount || Number(form.total_amount) <= 0) {
      setError('Enter a valid total amount.'); return;
    }
    setSubmitting(true);
    fetch(`${BASE}/fees/structures`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, total_amount: Number(form.total_amount) })
    })
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else { setSuccess('Fee structure added.'); setAddModal(false); load(); }
      })
      .catch(() => setError('Failed to add fee structure.'))
      .finally(() => setSubmitting(false));
  };

  const handleReview = () => {
    setSubmitting(true);
    fetch(`${BASE}/fees/scholarship-applications/${reviewModal.id}/review`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: reviewForm.status,
        approved_amount: reviewForm.approved_amount ? Number(reviewForm.approved_amount) : null,
        admin_remarks: reviewForm.admin_remarks,
        admin_id: 1
      })
    })
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else { setSuccess(`Application ${reviewForm.status.toLowerCase()}.`); setReviewModal(null); load(); }
      })
      .catch(() => setError('Failed to update application.'))
      .finally(() => setSubmitting(false));
  };

  if (loading) return <div className="loading-text">Loading admin dashboard...</div>;

  const ov = overview;

  return (
    <div>
      <Alert type="danger" msg={error} />
      <Alert type="success" msg={success} />

      {/* KPI Stats */}
      {ov?.overall && (
        <div className="stats-grid" style={{ marginBottom: '18px' }}>
          <StatCard label="Total Payable" value={`Rs. ${fmt(ov.overall.total_payable)}`} />
          <StatCard label="Total Collected" value={`Rs. ${fmt(ov.overall.total_collected)}`} />
          <StatCard label="Total Outstanding" value={`Rs. ${fmt(ov.overall.total_outstanding)}`} />
          <StatCard label="Pending Transactions" value={ov.transaction_stats?.pending_count ?? 0} />
        </div>
      )}

      {/* Department summary */}
      {ov?.dept_summary && ov.dept_summary.length > 0 && (
        <div className="panel-card" style={{ marginBottom: '16px' }}>
          <div className="panel-card-header">Department-wise Summary</div>
          <div className="panel-card-body table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Department & Semester</th>
                  <th>Records</th>
                  <th>Total Payable (Rs.)</th>
                  <th>Collected (Rs.)</th>
                  <th>Outstanding (Rs.)</th>
                </tr>
              </thead>
              <tbody>
                {ov.dept_summary.map((d, i) => (
                  <tr key={i}>
                    <td>{d.department} (Sem {d.semester})</td>
                    <td>{d.students}</td>
                    <td>{fmt(d.payable)}</td>
                    <td>{fmt(d.collected)}</td>
                    <td>{fmt(d.outstanding)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Category summary */}
      {ov?.category_summary && ov.category_summary.length > 0 && (
        <div className="panel-card" style={{ marginBottom: '16px' }}>
          <div className="panel-card-header">Category-wise Breakdown</div>
          <div className="panel-card-body table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Total Payable (Rs.)</th>
                  <th>Collected (Rs.)</th>
                  <th>Outstanding (Rs.)</th>
                </tr>
              </thead>
              <tbody>
                {ov.category_summary.map((c, i) => (
                  <tr key={i}>
                    <td>{c.fee_category}</td>
                    <td>{fmt(c.payable)}</td>
                    <td>{fmt(c.collected)}</td>
                    <td>{fmt(c.outstanding)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pending students */}
      {ov?.pending_students && ov.pending_students.length > 0 && (
        <div className="panel-card" style={{ marginBottom: '16px' }}>
          <div className="panel-card-header">Students with Outstanding Dues</div>
          <div className="panel-card-body table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>USN</th>
                  <th>Department</th>
                  <th>Semester</th>
                  <th>Outstanding (Rs.)</th>
                </tr>
              </thead>
              <tbody>
                {ov.pending_students.map((s, i) => (
                  <tr key={i}>
                    <td>{s.student_name || s.name}</td>
                    <td>{s.usn}</td>
                    <td>{s.department}</td>
                    <td>Sem {s.semester}</td>
                    <td style={{ color: '#dc2626', fontWeight: 600 }}>{fmt(s.total_outstanding)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Fee Structures management */}
      <div className="panel-card" style={{ marginBottom: '16px' }}>
        <div className="panel-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Fee Structures ({academicYear})</span>
          <button type="button" className="btn-primary" style={{ fontSize: '12px', padding: '4px 10px' }}
            onClick={() => { setAddModal(true); setError(''); setSuccess(''); }}>
            Add Structure
          </button>
        </div>
        <div className="panel-card-body table-responsive">
          {structures.length === 0 ? (
            <p style={{ color: '#6b7280', fontSize: '13px' }}>No fee structures found for {academicYear}.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Semester</th>
                  <th>Category</th>
                  <th>Total Amount (Rs.)</th>
                  <th>Due Date</th>
                  <th>Partial Payment</th>
                </tr>
              </thead>
              <tbody>
                {structures.map((s, i) => (
                  <tr key={i}>
                    <td>{s.department}</td>
                    <td>Sem {s.semester}</td>
                    <td>{s.fee_category}</td>
                    <td>{fmt(s.total_amount)}</td>
                    <td>{fmtDate(s.due_date)}</td>
                    <td>{s.partial_payment_allowed ? 'Allowed' : 'Not Allowed'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Scholarship Applications Review */}
      <div className="panel-card">
        <div className="panel-card-header">Scholarship Applications</div>
        <div className="panel-card-body table-responsive">
          {scholarshipApps.length === 0 ? (
            <p style={{ color: '#6b7280', fontSize: '13px' }}>No scholarship applications to review.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Scholarship</th>
                  <th>Applied On</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {scholarshipApps.map(ap => (
                  <tr key={ap.id}>
                    <td>{ap.student_name || `Student #${ap.student_id}`}</td>
                    <td>{ap.scholarship_name}</td>
                    <td>{fmtDate(ap.application_date)}</td>
                    <td><span className={statusClass(ap.status)}>{ap.status}</span></td>
                    <td>
                      {(ap.status === 'Submitted' || ap.status === 'Under Review') ? (
                        <button type="button" className="btn-primary"
                          style={{ fontSize: '11px', padding: '3px 8px' }}
                          onClick={() => {
                            setReviewModal(ap);
                            setReviewForm({ status: 'Approved', approved_amount: '', admin_remarks: '' });
                            setError(''); setSuccess('');
                          }}>
                          Review
                        </button>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add Fee Structure Modal */}
      {addModal && (
        <Modal title="Add Fee Structure" onClose={() => setAddModal(false)}>
          <Alert type="danger" msg={error} />
          {[
            { label: 'Department', key: 'department', type: 'text' },
            { label: 'Semester', key: 'semester', type: 'number' },
            { label: 'Academic Year', key: 'academic_year', type: 'text' },
            { label: 'Fee Category', key: 'fee_category', type: 'text' },
            { label: 'Total Amount (Rs.)', key: 'total_amount', type: 'number' },
            { label: 'Due Date', key: 'due_date', type: 'date' }
          ].map(f => (
            <div className="form-group" key={f.key}>
              <label className="form-label">{f.label}</label>
              <input
                type={f.type}
                className="form-input"
                value={form[f.key]}
                onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
              />
            </div>
          ))}
          <div className="form-group">
            <label className="form-label">
              <input
                type="checkbox"
                checked={form.partial_payment_allowed === 1}
                onChange={e => setForm(prev => ({ ...prev, partial_payment_allowed: e.target.checked ? 1 : 0 }))}
                style={{ marginRight: '8px' }}
              />
              Allow Partial Payment
            </label>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
            <button type="button" className="btn-primary" onClick={handleAddStructure} disabled={submitting}>
              {submitting ? 'Adding...' : 'Add Structure'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setAddModal(false)}>Cancel</button>
          </div>
        </Modal>
      )}

      {/* Review Scholarship Modal */}
      {reviewModal && (
        <Modal title={`Review: ${reviewModal.scholarship_name}`} onClose={() => setReviewModal(null)}>
          <Alert type="danger" msg={error} />
          <div style={{ fontSize: '13px', color: '#374151', marginBottom: '12px' }}>
            <strong>Student:</strong> {reviewModal.student_name || `#${reviewModal.student_id}`}<br />
            <strong>Applied:</strong> {fmtDate(reviewModal.application_date)}<br />
            {reviewModal.application_text && (
              <><strong>Note:</strong> {reviewModal.application_text}</>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Decision</label>
            <select className="form-select" value={reviewForm.status}
              onChange={e => setReviewForm(prev => ({ ...prev, status: e.target.value }))}>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Under Review">Under Review</option>
            </select>
          </div>
          {reviewForm.status === 'Approved' && (
            <div className="form-group">
              <label className="form-label">Approved Amount (Rs.)</label>
              <input type="number" className="form-input"
                value={reviewForm.approved_amount}
                onChange={e => setReviewForm(prev => ({ ...prev, approved_amount: e.target.value }))}
                placeholder="Enter approved amount"
              />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Admin Remarks</label>
            <textarea className="form-input" rows={3}
              value={reviewForm.admin_remarks}
              onChange={e => setReviewForm(prev => ({ ...prev, admin_remarks: e.target.value }))}
              placeholder="Add remarks for the student..."
              style={{ resize: 'vertical' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
            <button type="button" className="btn-primary" onClick={handleReview} disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Decision'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setReviewModal(null)}>Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function FeesManagementView({ userRole, currentUser }) {
  const studentId = currentUser?.id || 1;

  const baseTabs = [
    { id: 'fee_details', label: 'Fee Details' },
    { id: 'make_payment', label: 'Make Payment' },
    { id: 'payment_history', label: 'Payment History' },
    { id: 'scholarships', label: 'Scholarships' },
    { id: 'fee_report', label: 'Fee Report' }
  ];
  const adminTab = { id: 'admin', label: 'Admin Dashboard' };
  const tabs = userRole === 'admin' ? [...baseTabs, adminTab] : baseTabs;

  const [activeTab, setActiveTab] = useState('fee_details');

  const renderTab = () => {
    switch (activeTab) {
      case 'fee_details':
        return <FeeDetailsTab studentId={studentId} />;
      case 'make_payment':
        return <MakePaymentTab studentId={studentId} />;
      case 'payment_history':
        return <PaymentHistoryTab studentId={studentId} userRole={userRole} />;
      case 'scholarships':
        return <ScholarshipsTab studentId={studentId} userRole={userRole} />;
      case 'fee_report':
        return <FeeReportTab studentId={studentId} />;
      case 'admin':
        return userRole === 'admin' ? <AdminDashboardTab /> : null;
      default:
        return <FeeDetailsTab studentId={studentId} />;
    }
  };

  return (
    <div>
      <div className="page-title" style={{ marginBottom: '16px' }}>Fees Management</div>
      <TabBar tabs={tabs} active={activeTab} onSelect={setActiveTab} />
      {renderTab()}
    </div>
  );
}
