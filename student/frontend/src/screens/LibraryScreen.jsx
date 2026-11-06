import React, { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest } from '../api';
import DataCards from '../components/DataCards';
import ErrorCard from '../components/ErrorCard';
import Sheet from './Sheet';
import useTracked, { loadingOf } from './useTracked';
import './library.css';

const CATEGORIES = ['Computer Science', 'Mathematics & Statistics', 'Electronics & Communication', 'Information Science'];
const EMPTY_BOOK = {
  isbn: '',
  title: '',
  author: '',
  category: 'Computer Science',
  publisher: '',
  edition: '1st Edition',
  shelf_location: 'Rack CS-01',
  total_copies: 5
};
const DEFAULT_ISSUE = { usn: '1MS21CS084', student_name: 'Alex Kumar', days: 14 };
const EMPTY_MINE = { borrowed_books: [], total_active: 0, total_overdue_fines: 0, reminders: [] };
const money = (n) => `Rs ${Number(n || 0).toFixed(2)}`;

export default function LibraryView({ userRole }) {
  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog', 'my_books', 'history', 'circulation'
  const [books, setBooks] = useState([]);
  const [stats, setStats] = useState({ total_titles: 0, total_copies: 0, available_copies: 0, issued_copies: 0 });
  const [myBooks, setMyBooks] = useState(EMPTY_MINE);
  const [history, setHistory] = useState([]);
  const { loading, errors: loadErrors, track } = useTracked();
  const isLoading = loadingOf(loading);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [dialogError, setDialogError] = useState('');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [availabilityFilter, setAvailabilityFilter] = useState('ALL');

  // Dialogs
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_BOOK);
  const [editingBook, setEditingBook] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', author: '', category: '', publisher: '', edition: '', shelf_location: '', total_copies: 5 });
  const [issuingBook, setIssuingBook] = useState(null); // book in the Issue dialog
  const [deskBookId, setDeskBookId] = useState(''); // book chosen on the circulation desk form
  const [issueForm, setIssueForm] = useState(DEFAULT_ISSUE);
  const [returningRecord, setReturningRecord] = useState(null);
  const [returnRemarks, setReturnRemarks] = useState('Returned in good condition');

  const searchRef = useRef('');
  searchRef.current = searchTerm;

  const loadCatalog = useCallback(() => {
    let url = '/library/books?';
    if (searchRef.current) url += `search=${encodeURIComponent(searchRef.current)}&`;
    if (categoryFilter !== 'ALL') url += `category=${encodeURIComponent(categoryFilter)}&`;
    if (availabilityFilter !== 'ALL') url += `availability=${encodeURIComponent(availabilityFilter.toLowerCase())}&`;
    return track('catalog', apiRequest(url), (res) => {
      setBooks(res.books || []);
      if (res.stats) setStats(res.stats);
    });
  }, [track, categoryFilter, availabilityFilter]);

  const loadMyBooks = useCallback(
    () => track('mine', apiRequest('/library/my-books?usn=1MS21CS084'), (res) => setMyBooks(res)),
    [track]
  );

  const loadHistory = useCallback(
    () => track('history', apiRequest('/library/history?usn=1MS21CS084'), (res) => setHistory(res.history || [])),
    [track]
  );

  const wantsCatalog = activeTab === 'catalog' || activeTab === 'circulation';
  const wantsMine = activeTab === 'my_books' || activeTab === 'circulation';

  useEffect(() => {
    if (wantsCatalog) loadCatalog();
  }, [wantsCatalog, loadCatalog]);
  useEffect(() => {
    if (wantsMine) loadMyBooks();
  }, [wantsMine, loadMyBooks]);
  useEffect(() => {
    if (activeTab === 'history') loadHistory();
  }, [activeTab, loadHistory]);
  const begin = () => {
    setMsg('');
    setError('');
    setDialogError('');
  };

  const handleAddBook = async (e) => {
    e?.preventDefault();
    begin();
    try {
      setBusy(true);
      const res = await apiRequest('/library/books', { method: 'POST', body: JSON.stringify(addForm) });
      setMsg(res.message);
      setShowAddModal(false);
      setAddForm(EMPTY_BOOK);
      loadCatalog();
    } catch (err) {
      setDialogError(err.message || 'Failed to add book.');
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateBook = async (e) => {
    e?.preventDefault();
    if (!editingBook) return;
    begin();
    try {
      setBusy(true);
      const res = await apiRequest(`/library/books/${editingBook.id}`, { method: 'PUT', body: JSON.stringify(editForm) });
      setMsg(res.message);
      setEditingBook(null);
      loadCatalog();
    } catch (err) {
      setDialogError(err.message || 'Failed to update book.');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteBook = async (bookId, title) => {
    if (!window.confirm(`Are you sure you want to remove "${title}" from the catalog?`)) return;
    begin();
    try {
      setBusy(true);
      const res = await apiRequest(`/library/books/${bookId}`, { method: 'DELETE' });
      setMsg(res.message);
      loadCatalog();
    } catch (err) {
      setError(err.message || 'Failed to delete book.');
    } finally {
      setBusy(false);
    }
  };

  // Shared by the Issue dialog and the circulation desk form.
  const issueBook = async (book, fromDialog) => {
    if (!book) return;
    begin();
    try {
      setBusy(true);
      const res = await apiRequest('/library/issue', {
        method: 'POST',
        body: JSON.stringify({
          book_id: book.id,
          usn: issueForm.usn,
          student_name: issueForm.student_name,
          days: parseInt(issueForm.days, 10)
        })
      });
      setMsg(res.message);
      if (fromDialog) setIssuingBook(null);
      else setDeskBookId('');
      loadCatalog();
      if (activeTab === 'my_books' || activeTab === 'circulation') loadMyBooks();
    } catch (err) {
      if (fromDialog) setDialogError(err.message || 'Failed to issue book.');
      else setError(err.message || 'Failed to issue book.');
    } finally {
      setBusy(false);
    }
  };

  const handleReturnBook = async (e) => {
    e?.preventDefault();
    if (!returningRecord) return;
    begin();
    try {
      setBusy(true);
      const res = await apiRequest(`/library/return/${returningRecord.id}`, {
        method: 'POST',
        body: JSON.stringify({ remarks: returnRemarks })
      });
      setMsg(res.message);
      setReturningRecord(null);
      setReturnRemarks('Returned in good condition');
      loadMyBooks();
      loadCatalog();
    } catch (err) {
      setDialogError(err.message || 'Failed to process return.');
    } finally {
      setBusy(false);
    }
  };

  const isLibrarian = userRole === 'admin' || userRole === 'faculty';
  const deskBook = books.find((b) => String(b.id) === String(deskBookId)) || null;
  const closeDialogs = () => {
    setShowAddModal(false);
    setEditingBook(null);
    setIssuingBook(null);
    setReturningRecord(null);
    setDialogError('');
  };
  const addField = (key) => (e) => setAddForm({ ...addForm, [key]: e.target.value });
  const editField = (key) => (e) => setEditForm({ ...editForm, [key]: e.target.value });
  const issueField = (key) => (e) => setIssueForm({ ...issueForm, [key]: e.target.value });
  const openReturn = (rec, remarks) => {
    setDialogError('');
    setReturningRecord(rec);
    setReturnRemarks(remarks);
  };

  const tabs = [
    { id: 'catalog', label: 'Catalog' },
    { id: 'my_books', label: `My Loans (${myBooks.total_active || 0})` },
    { id: 'history', label: 'History' },
    ...(isLibrarian ? [{ id: 'circulation', label: 'Circulation Desk' }] : [])
  ];

  const errorFor = (key, retry) =>
    loadErrors[key] ? <ErrorCard error={loadErrors[key]} onRetry={retry} /> : null;

  const categoryOptions = CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>);

  return (
    <div className="page library" data-qa="library-screen">
      <div className="tabs" role="tablist" aria-label="Library sections">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={activeTab === t.id}
            className={`tab${activeTab === t.id ? ' tab--on' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {msg && <div className="notice notice--good" role="status">{msg}</div>}
      {error && <div className="notice notice--bad" role="alert">{error}</div>}

      {/* TAB 1: BOOK CATALOG & SEARCH */}
      {activeTab === 'catalog' && (
        <>
          <div className="stat-grid">
            <div className="stat-tile"><strong>{stats.total_titles}</strong><span>Catalog titles</span></div>
            <div className="stat-tile"><strong>{stats.total_copies}</strong><span>Total copies</span></div>
            <div className="stat-tile"><strong>{stats.available_copies}</strong><span>Available to lend</span></div>
            <div className="stat-tile"><strong>{stats.issued_copies}</strong><span>Currently issued</span></div>
          </div>

          <form className="card library__form" onSubmit={(e) => { e.preventDefault(); loadCatalog(); }}>
            <div className="field">
              <label htmlFor="lib-search">Search</label>
              <input
                id="lib-search"
                type="text"
                placeholder="Title, author, ISBN, or shelf"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="lib-category">Category</label>
              <select id="lib-category" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="ALL">All Categories</option>
                {categoryOptions}
              </select>
            </div>
            <div className="field">
              <label htmlFor="lib-avail">Availability</label>
              <select id="lib-avail" value={availabilityFilter} onChange={(e) => setAvailabilityFilter(e.target.value)}>
                <option value="ALL">All Availability</option>
                <option value="available">Available Copies Only</option>
                <option value="out_of_stock">Out of Stock</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary">Search</button>
            {isLibrarian && (
              <button type="button" className="btn" onClick={() => { setDialogError(''); setShowAddModal(true); }}>
                + Add Book to Catalog
              </button>
            )}
          </form>

          <h2 className="section-title">Indexed Academic Books</h2>
          {!isLoading('catalog') && !loadErrors.catalog && <p className="library__count">Showing {books.length} volumes</p>}
          {errorFor('catalog', loadCatalog)}
          {isLoading('catalog') ? (
            <div className="empty-state">Searching catalog...</div>
          ) : loadErrors.catalog ? null : (
            <DataCards
              rows={books}
              keyOf={(b) => b.id}
              empty="No books matching your query criteria."
              title={(b) => b.title}
              value={(b) => (
                <span className={`pill ${b.available_copies > 0 ? 'pill--good' : 'pill--bad'}`}>
                  {b.available_copies} of {b.total_copies} available
                </span>
              )}
              meta={[
                { label: 'Edition', render: (b) => b.edition },
                { label: 'Author', render: (b) => b.author },
                { label: 'Publisher', render: (b) => b.publisher },
                { label: 'ISBN', render: (b) => <span className="library__isbn">{b.isbn}</span> },
                { label: 'Category', render: (b) => b.category },
                { label: 'Shelf', render: (b) => <strong>{b.shelf_location}</strong> },
                { label: 'Checked out', render: (b) => b.issued_copies },
                {
                  label: 'Action',
                  render: (b) => (
                    <span className="library__actions">
                      {isLibrarian ? (
                        <>
                          <button
                            type="button"
                            className="btn btn-primary"
                            disabled={b.available_copies === 0}
                            onClick={() => { setDialogError(''); setIssuingBook(b); setIssueForm(DEFAULT_ISSUE); }}
                          >
                            Issue
                          </button>
                          <button
                            type="button"
                            className="btn"
                            onClick={() => {
                              setDialogError('');
                              setEditingBook(b);
                              setEditForm({
                                title: b.title,
                                author: b.author,
                                category: b.category,
                                publisher: b.publisher,
                                edition: b.edition,
                                shelf_location: b.shelf_location,
                                total_copies: b.total_copies
                              });
                            }}
                          >
                            Edit
                          </button>
                          <button type="button" className="btn library__danger" onClick={() => handleDeleteBook(b.id, b.title)}>
                            Delete
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="btn"
                          onClick={() => {
                            if (b.available_copies > 0) {
                              alert(`Book is currently available on shelf ${b.shelf_location}. Visit the circulation counter with student ID to issue.`);
                            } else {
                              alert(`All copies are currently issued. Expected return queue active.`);
                            }
                          }}
                        >
                          View Shelf
                        </button>
                      )}
                    </span>
                  ),
                },
              ]}
            />
          )}
        </>
      )}

      {/* TAB 2: MY BORROWED BOOKS & RETURN REMINDERS */}
      {activeTab === 'my_books' && (
        <>
          {(myBooks.reminders || []).map((rem, idx) => (
            <div key={idx} className={`notice ${rem.severity === 'high' ? 'notice--bad' : 'notice--warn'}`} role="status">
              <strong>[{rem.type}] </strong>
              {rem.message}
            </div>
          ))}

          <div className="stat-grid">
            <div className="stat-tile"><strong>{myBooks.total_active || 0}</strong><span>Active loans</span></div>
            <div className="stat-tile"><strong>4</strong><span>UG student limit</span></div>
            <div className="stat-tile">
              <strong className={myBooks.total_overdue_fines > 0 ? 'library__bad' : 'library__good'}>{money(myBooks.total_overdue_fines)}</strong>
              <span>Overdue fines (Rs 2.00 / day)</span>
            </div>
          </div>

          <h2 className="section-title">Currently Borrowed Volumes</h2>
          <p className="library__hint">Borrower USN: 1MS21CS084</p>
          {errorFor('mine', loadMyBooks)}
          {isLoading('mine') ? (
            <div className="empty-state">Loading your loans...</div>
          ) : loadErrors.mine ? null : (
            <DataCards
              rows={myBooks.borrowed_books || []}
              keyOf={(rec) => rec.id}
              empty="No active book loans on your student record."
              title={(rec) => rec.title}
              value={(rec) =>
                rec.status === 'Overdue' ? (
                  <span className="pill pill--bad">Overdue by {rec.overdue_days} day(s)</span>
                ) : (
                  <span className="pill pill--good">{rec.days_remaining} day(s) remaining</span>
                )
              }
              meta={[
                { label: 'Author', render: (rec) => rec.author },
                { label: 'ISBN', render: (rec) => rec.isbn },
                { label: 'Shelf', render: (rec) => rec.shelf_location },
                { label: 'Issued', render: (rec) => rec.issue_date },
                { label: 'Due', render: (rec) => <strong>{rec.due_date}</strong> },
                {
                  label: 'Fine',
                  render: (rec) => (
                    <span className={rec.calculated_fine > 0 ? 'library__bad' : 'library__good'}>{money(rec.calculated_fine)}</span>
                  ),
                },
                {
                  label: 'Action',
                  render: (rec) => (
                    <button type="button" className="btn" onClick={() => openReturn(rec, 'Returned in good condition')}>
                      Return Book
                    </button>
                  ),
                },
              ]}
            />
          )}
        </>
      )}

      {/* TAB 3: BORROWING HISTORY */}
      {activeTab === 'history' && (
        <>
          <h2 className="section-title">Borrowing History &amp; Clearance Ledger</h2>
          {errorFor('history', loadHistory)}
          {isLoading('history') ? (
            <div className="empty-state">Loading history...</div>
          ) : loadErrors.history ? null : (
            <DataCards
              rows={history}
              keyOf={(h) => h.id}
              empty="No past borrowing history on record."
              title={(h) => h.title}
              value={() => <span className="pill pill--good">Returned</span>}
              meta={[
                { label: 'Author', render: (h) => h.author },
                { label: 'Category', render: (h) => h.category },
                { label: 'Issued', render: (h) => h.issue_date },
                { label: 'Returned', render: (h) => h.return_date || '-' },
                { label: 'Fine paid', render: (h) => money(h.fine_amount) },
                { label: 'Remarks', render: (h) => h.librarian_remarks || 'Returned on schedule' },
              ]}
            />
          )}
        </>
      )}

      {/* TAB 4: LIBRARIAN CIRCULATION DESK (FACULTY / ADMIN ONLY) */}
      {activeTab === 'circulation' && isLibrarian && (
        <>
          <form
            className="card library__form"
            onSubmit={(e) => { e.preventDefault(); issueBook(deskBook, false); }}
          >
            <h2 className="section-title">Issue Book to Student</h2>
            <div className="field">
              <label htmlFor="lib-desk-book">Select Textbook from Catalog</label>
              <select id="lib-desk-book" required value={deskBookId} onChange={(e) => setDeskBookId(e.target.value)}>
                <option value="">-- Choose Book --</option>
                {books.map((b) => (
                  <option key={b.id} value={b.id} disabled={b.available_copies <= 0}>
                    {b.title} ({b.available_copies} available) - {b.shelf_location}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="lib-desk-usn">Student USN</label>
              <input id="lib-desk-usn" type="text" required value={issueForm.usn} onChange={issueField('usn')} />
            </div>
            <div className="field">
              <label htmlFor="lib-desk-name">Student Full Name</label>
              <input id="lib-desk-name" type="text" required value={issueForm.student_name} onChange={issueField('student_name')} />
            </div>
            <div className="field">
              <label htmlFor="lib-desk-days">Lending Period (Days)</label>
              <select id="lib-desk-days" value={issueForm.days} onChange={issueField('days')}>
                <option value={7}>7 Days (Reserve Loan)</option>
                <option value={14}>14 Days (Standard Student Loan)</option>
                <option value={28}>28 Days (Faculty / Research Loan)</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" disabled={!deskBook || deskBook.available_copies <= 0 || busy}>
              Confirm Issue &amp; Record Loan
            </button>
          </form>

          <h2 className="section-title">Active Circulation Returns</h2>
          <p className="library__hint">Late fines are calculated at Rs 2.00/day when a record is cleared.</p>
          {errorFor('mine', loadMyBooks)}
          {isLoading('mine') ? (
            <div className="empty-state">Loading loans...</div>
          ) : loadErrors.mine ? null : (
            <DataCards
              rows={myBooks.borrowed_books || []}
              keyOf={(b) => b.id}
              empty="No active loan records for this test student."
              title={(b) => b.title}
              meta={[
                { label: 'Student', render: (b) => b.student_name },
                { label: 'USN', render: (b) => b.usn },
                { label: 'Due', render: (b) => b.due_date },
                {
                  label: 'Action',
                  render: (b) => (
                    <button type="button" className="btn" onClick={() => openReturn(b, 'Returned via Circulation Counter')}>
                      Process Return
                    </button>
                  ),
                },
              ]}
            />
          )}
        </>
      )}

      {showAddModal && (
        <Sheet title="Add New Textbook to Catalog" onClose={closeDialogs} onSubmit={handleAddBook}>
          {dialogError && <div className="notice notice--bad" role="alert">{dialogError}</div>}
          <div className="field">
            <label htmlFor="lib-add-isbn">ISBN Identifier</label>
            <input id="lib-add-isbn" type="text" placeholder="e.g. 978-0131103627" required value={addForm.isbn} onChange={addField('isbn')} />
          </div>
          <div className="field">
            <label htmlFor="lib-add-title">Textbook Title</label>
            <input id="lib-add-title" type="text" placeholder="e.g. Database System Concepts" required value={addForm.title} onChange={addField('title')} />
          </div>
          <div className="field">
            <label htmlFor="lib-add-author">Author(s)</label>
            <input id="lib-add-author" type="text" placeholder="e.g. Silberschatz, Korth" required value={addForm.author} onChange={addField('author')} />
          </div>
          <div className="field">
            <label htmlFor="lib-add-cat">Academic Category</label>
            <select id="lib-add-cat" value={addForm.category} onChange={addField('category')}>{categoryOptions}</select>
          </div>
          <div className="field">
            <label htmlFor="lib-add-pub">Publisher</label>
            <input id="lib-add-pub" type="text" placeholder="e.g. McGraw-Hill" value={addForm.publisher} onChange={addField('publisher')} />
          </div>
          <div className="field">
            <label htmlFor="lib-add-ed">Edition</label>
            <input id="lib-add-ed" type="text" placeholder="e.g. 7th Edition" value={addForm.edition} onChange={addField('edition')} />
          </div>
          <div className="field">
            <label htmlFor="lib-add-shelf">Shelf Location</label>
            <input id="lib-add-shelf" type="text" placeholder="e.g. Rack CS-04" required value={addForm.shelf_location} onChange={addField('shelf_location')} />
          </div>
          <div className="field">
            <label htmlFor="lib-add-copies">Total Copies</label>
            <input
              id="lib-add-copies" type="number" min="1" required value={addForm.total_copies}
              onChange={(e) => setAddForm({ ...addForm, total_copies: parseInt(e.target.value, 10) || 1 })}
            />
          </div>
          <div className="sticky-actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>Save Textbook</button>
            <button type="button" className="btn" onClick={closeDialogs}>Cancel</button>
          </div>
        </Sheet>
      )}

      {editingBook && (
        <Sheet title={`Edit Book: ${editingBook.title}`} onClose={closeDialogs} onSubmit={handleUpdateBook}>
          {dialogError && <div className="notice notice--bad" role="alert">{dialogError}</div>}
          <div className="field">
            <label htmlFor="lib-ed-title">Textbook Title</label>
            <input id="lib-ed-title" type="text" required value={editForm.title} onChange={editField('title')} />
          </div>
          <div className="field">
            <label htmlFor="lib-ed-author">Author</label>
            <input id="lib-ed-author" type="text" required value={editForm.author} onChange={editField('author')} />
          </div>
          <div className="field">
            <label htmlFor="lib-ed-cat">Category</label>
            <input id="lib-ed-cat" type="text" required value={editForm.category} onChange={editField('category')} />
          </div>
          <div className="field">
            <label htmlFor="lib-ed-pub">Publisher</label>
            <input id="lib-ed-pub" type="text" value={editForm.publisher} onChange={editField('publisher')} />
          </div>
          <div className="field">
            <label htmlFor="lib-ed-ed">Edition</label>
            <input id="lib-ed-ed" type="text" value={editForm.edition} onChange={editField('edition')} />
          </div>
          <div className="field">
            <label htmlFor="lib-ed-shelf">Shelf Location</label>
            <input id="lib-ed-shelf" type="text" required value={editForm.shelf_location} onChange={editField('shelf_location')} />
          </div>
          <div className="field">
            <label htmlFor="lib-ed-copies">Total Copies (Min: {editingBook.issued_copies})</label>
            <input
              id="lib-ed-copies" type="number" min={editingBook.issued_copies} required value={editForm.total_copies}
              onChange={(e) => setEditForm({ ...editForm, total_copies: parseInt(e.target.value, 10) || editingBook.issued_copies })}
            />
          </div>
          <div className="sticky-actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>Update Book</button>
            <button type="button" className="btn" onClick={closeDialogs}>Cancel</button>
          </div>
        </Sheet>
      )}

      {issuingBook && (
        <Sheet title="Issue Book to Student" onClose={closeDialogs} onSubmit={(e) => { e.preventDefault(); issueBook(issuingBook, true); }}>
          <div className="notice">
            <div>Book: <strong>{issuingBook.title}</strong></div>
            <div>Shelf: {issuingBook.shelf_location} | Available: {issuingBook.available_copies}</div>
          </div>
          {dialogError && <div className="notice notice--bad" role="alert">{dialogError}</div>}
          <div className="field">
            <label htmlFor="lib-is-usn">Student USN</label>
            <input id="lib-is-usn" type="text" required value={issueForm.usn} onChange={issueField('usn')} />
          </div>
          <div className="field">
            <label htmlFor="lib-is-name">Student Full Name</label>
            <input id="lib-is-name" type="text" required value={issueForm.student_name} onChange={issueField('student_name')} />
          </div>
          <div className="field">
            <label htmlFor="lib-is-days">Loan Duration</label>
            <select id="lib-is-days" value={issueForm.days} onChange={issueField('days')}>
              <option value={7}>7 Days</option>
              <option value={14}>14 Days (Standard)</option>
              <option value={28}>28 Days</option>
            </select>
          </div>
          <div className="sticky-actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>Confirm Issue</button>
            <button type="button" className="btn" onClick={closeDialogs}>Cancel</button>
          </div>
        </Sheet>
      )}

      {returningRecord && (
        <Sheet title="Process Book Return" onClose={closeDialogs} onSubmit={handleReturnBook}>
          <div className="notice">
            <div>Book: <strong>{returningRecord.title}</strong></div>
            <div>Due Date: <strong>{returningRecord.due_date}</strong></div>
            {returningRecord.calculated_fine > 0 ? (
              <div className="library__bad">Late Fine Accrued: {money(returningRecord.calculated_fine)}</div>
            ) : (
              <div className="library__good">Returned within due date. Zero fine.</div>
            )}
          </div>
          {dialogError && <div className="notice notice--bad" role="alert">{dialogError}</div>}
          <div className="field">
            <label htmlFor="lib-ret-remarks">Clearance Remarks</label>
            <input id="lib-ret-remarks" type="text" required value={returnRemarks} onChange={(e) => setReturnRemarks(e.target.value)} />
          </div>
          <div className="sticky-actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>Confirm Return &amp; Clear Record</button>
            <button type="button" className="btn" onClick={closeDialogs}>Cancel</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
