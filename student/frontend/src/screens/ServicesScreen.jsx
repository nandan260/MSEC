import React, { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest } from '../api';
import DataCards from '../components/DataCards';
import ErrorCard from '../components/ErrorCard';
import Sheet from './Sheet';
import useTracked from './useTracked';
import { CAMPUS_BUILDINGS } from './campusBuildings';
import './services.css';

const LF_CATEGORIES = ['Electronics', 'Documents & IDs', 'Books & Stationery', 'Personal Items'];
const newReportForm = () => ({
  report_type: 'Lost',
  item_title: '',
  category: 'Personal Items',
  location_reported: '',
  date_reported: new Date().toISOString().split('T')[0],
  description: '',
  reporter_name: 'Alex Kumar',
  reporter_usn: '1MS21CS084',
  contact_email: 'student@college.edu',
  contact_phone: '+91 98765 43210',
  claim_instructions: 'Contact reporter directly or check with department office.'
});
const stopTone = (status) => (status === 'Passed' ? '' : status === 'Current' ? 'pill--good' : 'pill--warn');

export default function CampusServicesView({ userRole }) {
  const [activeTab, setActiveTab] = useState('bus'); // 'bus', 'map', 'canteen', 'lost_found', 'facilities'
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [dialogError, setDialogError] = useState('');
  const [dialogNote, setDialogNote] = useState('');
  const { isLoading, errors, track } = useTracked();

  // 1. Bus Tracking State
  const [busRoutes, setBusRoutes] = useState([]);
  const [selectedRouteIdx, setSelectedRouteIdx] = useState(0);
  const [busDisclaimer, setBusDisclaimer] = useState('');

  // 2. Campus Map State
  const [selectedBuildingId, setSelectedBuildingId] = useState('cs_block');
  const [mapSearch, setMapSearch] = useState('');

  // 3. Canteen State
  const [canteenInfo, setCanteenInfo] = useState(null);
  const [canteenMenu, setCanteenMenu] = useState([]);
  const [canteenCategory, setCanteenCategory] = useState('ALL');
  const [canteenDietary, setCanteenDietary] = useState('ALL');
  const [canteenSearch, setCanteenSearch] = useState('');

  // 4. Lost & Found State
  const [lostFoundItems, setLostFoundItems] = useState([]);
  const [lfTypeFilter, setLfTypeFilter] = useState('ALL');
  const [lfCategoryFilter, setLfCategoryFilter] = useState('ALL');
  const [lfStatusFilter, setLfStatusFilter] = useState('ALL');
  const [lfSearch, setLfSearch] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportForm, setReportForm] = useState(newReportForm);
  const [contactingItem, setContactingItem] = useState(null);
  const [itemMessages, setItemMessages] = useState([]);
  const [inquiryText, setInquiryText] = useState('');

  // 5. Facilities State
  const [facilities, setFacilities] = useState([]);
  const [facilityCategory, setFacilityCategory] = useState('ALL');
  const [facilitySearch, setFacilitySearch] = useState('');

  // Search boxes apply on submit; the selects reload as soon as they change.
  const searchRef = useRef({});
  searchRef.current = { canteen: canteenSearch, lf: lfSearch, fac: facilitySearch };

  const loadBusRoutes = useCallback(
    () =>
      track('bus', apiRequest('/services/bus-routes'), (res) => {
        setBusRoutes(res.routes || []);
        setBusDisclaimer(res.tracking_disclaimer || '');
      }),
    [track]
  );

  const loadCanteen = useCallback(() => {
    let url = '/services/canteen?';
    if (canteenCategory !== 'ALL') url += `category=${encodeURIComponent(canteenCategory)}&`;
    if (canteenDietary !== 'ALL') url += `dietary=${encodeURIComponent(canteenDietary)}&`;
    if (searchRef.current.canteen) url += `search=${encodeURIComponent(searchRef.current.canteen)}&`;
    return track('canteen', apiRequest(url), (res) => {
      setCanteenInfo(res.info || null);
      setCanteenMenu(res.menu || []);
    });
  }, [track, canteenCategory, canteenDietary]);

  const loadLostFound = useCallback(() => {
    let url = '/services/lost-found?';
    if (lfTypeFilter !== 'ALL') url += `type=${encodeURIComponent(lfTypeFilter)}&`;
    if (lfCategoryFilter !== 'ALL') url += `category=${encodeURIComponent(lfCategoryFilter)}&`;
    if (lfStatusFilter !== 'ALL') url += `status=${encodeURIComponent(lfStatusFilter)}&`;
    if (searchRef.current.lf) url += `search=${encodeURIComponent(searchRef.current.lf)}&`;
    return track('lf', apiRequest(url), (res) => setLostFoundItems(res.items || []));
  }, [track, lfTypeFilter, lfCategoryFilter, lfStatusFilter]);

  const loadFacilities = useCallback(() => {
    let url = '/services/facilities?';
    if (facilityCategory !== 'ALL') url += `category=${encodeURIComponent(facilityCategory)}&`;
    if (searchRef.current.fac) url += `search=${encodeURIComponent(searchRef.current.fac)}&`;
    return track('fac', apiRequest(url), (res) => setFacilities(res.facilities || []));
  }, [track, facilityCategory]);

  const loadMessages = useCallback(
    (item) =>
      track('messages', apiRequest(`/services/lost-found/${item.id}/messages`), (res) => setItemMessages(res.messages || [])),
    [track]
  );

  useEffect(() => {
    if (activeTab === 'bus') loadBusRoutes();
  }, [activeTab, loadBusRoutes]);
  useEffect(() => {
    if (activeTab === 'canteen') loadCanteen();
  }, [activeTab, loadCanteen]);
  useEffect(() => {
    if (activeTab === 'lost_found') loadLostFound();
  }, [activeTab, loadLostFound]);
  useEffect(() => {
    if (activeTab === 'facilities') loadFacilities();
  }, [activeTab, loadFacilities]);

  const handleToggleAvailability = async (itemId, currentAvailability) => {
    const newAvail = currentAvailability === 'Available' ? 'Sold Out' : 'Available';
    setMsg('');
    setError('');
    try {
      setBusy(true);
      const res = await apiRequest(`/services/canteen/${itemId}/availability`, {
        method: 'PUT',
        body: JSON.stringify({ availability: newAvail })
      });
      setMsg(res.message);
      loadCanteen();
    } catch (err) {
      setError(err.message || 'Failed to update item availability.');
    } finally {
      setBusy(false);
    }
  };

  const handleCreateReport = async (e) => {
    e?.preventDefault();
    setMsg('');
    setError('');
    setDialogError('');
    try {
      setBusy(true);
      const res = await apiRequest('/services/lost-found', {
        method: 'POST',
        body: JSON.stringify(reportForm)
      });
      setMsg(res.message);
      setShowReportModal(false);
      setReportForm(newReportForm());
      loadLostFound();
    } catch (err) {
      setDialogError(err.message || 'Failed to submit report.');
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateStatus = async (itemId, newStatus) => {
    setMsg('');
    setError('');
    try {
      setBusy(true);
      const res = await apiRequest(`/services/lost-found/${itemId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      setMsg(res.message);
      loadLostFound();
    } catch (err) {
      setError(err.message || 'Failed to update report status.');
    } finally {
      setBusy(false);
    }
  };

  const openContactModal = (item) => {
    setContactingItem(item);
    setInquiryText('');
    setItemMessages([]);
    setDialogError('');
    setDialogNote('');
    loadMessages(item);
  };

  const handleSendInquiry = async (e) => {
    e?.preventDefault();
    if (!contactingItem || !inquiryText.trim()) return;
    setDialogError('');
    setDialogNote('');
    try {
      const res = await apiRequest(`/services/lost-found/${contactingItem.id}/message`, {
        method: 'POST',
        body: JSON.stringify({
          sender_name: 'Alex Kumar',
          sender_usn: '1MS21CS084',
          sender_contact: '+91 98765 43210',
          message: inquiryText.trim()
        })
      });
      setDialogNote(res.message);
      setInquiryText('');
      loadMessages(contactingItem);
      loadLostFound();
    } catch (err) {
      setDialogError(err.message || 'Failed to send message.');
    }
  };

  const closeReport = () => {
    setShowReportModal(false);
    setDialogError('');
  };
  const closeContact = () => {
    setContactingItem(null);
    setDialogError('');
    setDialogNote('');
  };
  const openReport = (type) => {
    setDialogError('');
    setReportForm({ ...reportForm, report_type: type });
    setShowReportModal(true);
  };
  const reportField = (key) => (e) => setReportForm({ ...reportForm, [key]: e.target.value });

  const selectedBuilding = CAMPUS_BUILDINGS.find((b) => b.id === selectedBuildingId) || CAMPUS_BUILDINGS[0];
  const filteredBuildings = CAMPUS_BUILDINGS.filter((b) => {
    if (!mapSearch) return true;
    const q = mapSearch.toLowerCase();
    return b.name.toLowerCase().includes(q) || b.departments.toLowerCase().includes(q) || b.code.toLowerCase().includes(q);
  });

  const isStaff = userRole === 'admin' || userRole === 'faculty';
  const tabs = [
    { id: 'bus', label: 'Bus' },
    { id: 'map', label: 'Campus Map' },
    { id: 'canteen', label: 'Canteen' },
    { id: 'lost_found', label: `Lost & Found (${lostFoundItems.length || 0})` },
    { id: 'facilities', label: 'Facilities' }
  ];
  const errorCard = (key, retry) => (errors[key] ? <ErrorCard error={errors[key]} onRetry={retry} /> : null);
  const submitOnEnter = (reload) => (e) => {
    e.preventDefault();
    reload();
  };
  const currentRoute = busRoutes[selectedRouteIdx];

  return (
    <div className="page services" data-qa="services-screen">
      <div className="tabs" role="tablist" aria-label="Campus services">
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

      {/* 1. BUS TRACKING & TRANSIT */}
      {activeTab === 'bus' && (
        <>
          <div className="notice notice--warn">
            <strong>Notice on Bus Telematics: </strong>
            {busDisclaimer || 'Simulation / Demo Tracking Mode Active. Hardware GPS satellite telematics are currently simulated for demonstration.'}
          </div>
          {errorCard('bus', loadBusRoutes)}
          {isLoading('bus') ? (
            <div className="empty-state">Loading transit routes...</div>
          ) : errors.bus ? null : busRoutes.length === 0 ? (
            <div className="empty-state">No transit routes available.</div>
          ) : (
            <>
              <h2 className="section-title">Select Transit Route</h2>
              <div className="services__list" role="group" aria-label="Transit routes">
                {busRoutes.map((r, idx) => (
                  <button
                    key={r.id}
                    type="button"
                    aria-pressed={selectedRouteIdx === idx}
                    className={`tab services__route${selectedRouteIdx === idx ? ' tab--on' : ''}`}
                    onClick={() => setSelectedRouteIdx(idx)}
                  >
                    {r.route_number}: {r.start_point} to {r.end_point}
                  </button>
                ))}
              </div>

              {currentRoute && (
                <>
                  <div className="card services__form">
                    <div className="card-row">
                      <div className="data-card-title">
                        {currentRoute.route_number} - {currentRoute.start_point} to {currentRoute.end_point}
                      </div>
                      <span className="pill pill--good">{currentRoute.status}</span>
                    </div>
                    <p className="services__hint">Vehicle: <strong>{currentRoute.bus_number}</strong></p>
                    <div className="stat-grid services__stats">
                      <div className="stat-tile services__stat">
                        <strong>{currentRoute.current_demo_location}</strong>
                        <span>Simulated waypoint location</span>
                      </div>
                      <div className="stat-tile services__stat">
                        <strong>{currentRoute.demo_speed_kmh} km/h</strong>
                        <span>Operating speed (normal transit)</span>
                      </div>
                      <div className="stat-tile services__stat">
                        <strong>{currentRoute.driver_name}</strong>
                        <span>Driver in charge ({currentRoute.driver_phone})</span>
                      </div>
                    </div>
                  </div>

                  <h2 className="section-title">Stops &amp; Estimated Schedule</h2>
                  <DataCards
                    rows={currentRoute.stops || []}
                    keyOf={(stop) => stop.stop_number}
                    empty="No stops listed for this route."
                    title={(stop) => `#${stop.stop_number} ${stop.stop_name}`}
                    value={(stop) => <span className={`pill ${stopTone(stop.status)}`}>{stop.status}</span>}
                    meta={[
                      {
                        label: 'Here now',
                        render: (stop) =>
                          currentRoute.current_demo_location.toLowerCase().includes(stop.stop_name.toLowerCase()) ? (
                            <span className="pill pill--good">Bus Currently Here</span>
                          ) : null,
                      },
                      { label: 'Morning pickup', render: (stop) => stop.morning_time },
                      { label: 'Evening departure', render: (stop) => stop.evening_time },
                    ]}
                  />
                </>
              )}
            </>
          )}
        </>
      )}

      {/* 2. CAMPUS MAP & DIRECTORY */}
      {activeTab === 'map' && (
        <>
          <div className="card services__form">
            <div className="field">
              <label htmlFor="svc-map-search">Search buildings</label>
              <input
                id="svc-map-search"
                type="text"
                placeholder="Building, department, or code"
                value={mapSearch}
                onChange={(e) => setMapSearch(e.target.value)}
              />
            </div>
            <p className="services__hint">Tap a building to view its directory details.</p>
          </div>

          <h2 className="section-title">Campus Master Plan (45 acres)</h2>
          {filteredBuildings.length === 0 ? (
            <div className="empty-state">No buildings match your search.</div>
          ) : (
            <div className="services__grid">
              {filteredBuildings.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  aria-pressed={selectedBuildingId === b.id}
                  className={`services__building${selectedBuildingId === b.id ? ' services__building--on' : ''}`}
                  onClick={() => setSelectedBuildingId(b.id)}
                >
                  <span>
                    <span className="services__bcode">{b.code}</span>
                    <span className="services__bname">{b.name}</span>
                  </span>
                  <span className="services__bcat">{b.category}</span>
                </button>
              ))}
            </div>
          )}
          <p className="services__gates">
            Gates: Gate 1 (North Ring Road) | Gate 2 (Student Plaza &amp; Canteen) | Gate 3 (Sports Arena &amp; Athletic Ground)
          </p>

          <div className="card services__details">
            <div className="card-row">
              <div className="data-card-title">{selectedBuilding.name}</div>
              <span className="pill">{selectedBuilding.code}</span>
            </div>
            <span className="pill pill--info">{selectedBuilding.category}</span>
            <p className="services__body">{selectedBuilding.description}</p>
            <dl className="services__facts">
              <div><dt>Floor distribution</dt><dd>{selectedBuilding.floors}</dd></div>
              <div><dt>Operating hours</dt><dd>{selectedBuilding.timings}</dd></div>
              <div><dt>Officer in charge</dt><dd>{selectedBuilding.in_charge}</dd></div>
              <div><dt>Contact telephone</dt><dd>{selectedBuilding.contact}</dd></div>
            </dl>
            <div>
              <div className="services__label">Departments &amp; units inside</div>
              <p className="services__body">{selectedBuilding.departments}</p>
            </div>
          </div>
        </>
      )}

      {/* 3. CANTEEN & FOOD COURT */}
      {activeTab === 'canteen' && (
        <>
          {canteenInfo && (
            <div className="card services__form">
              <div className="card-row">
                <div className="data-card-title">{canteenInfo.name}</div>
                <span className="pill pill--good">Open Today</span>
              </div>
              <p className="services__hint">Location: {canteenInfo.location}</p>
              <dl className="services__info">
                <div><dt>Operating timings</dt><dd>{canteenInfo.opening_hours}</dd></div>
                <div>
                  <dt>Meal schedule</dt>
                  <dd>Breakfast: {canteenInfo.breakfast_timings}</dd>
                  <dd>Lunch: {canteenInfo.lunch_timings}</dd>
                </div>
                <div>
                  <dt>Accepted payment</dt>
                  <dd>{canteenInfo.payment_methods}</dd>
                  <dd>Enquiry: {canteenInfo.contact}</dd>
                </div>
              </dl>
            </div>
          )}

          <form className="card services__form" onSubmit={submitOnEnter(loadCanteen)}>
            <div className="field">
              <label htmlFor="svc-can-search">Search</label>
              <input
                id="svc-can-search"
                type="text"
                placeholder="e.g. Masala Dosa, Thali, Coffee"
                value={canteenSearch}
                onChange={(e) => setCanteenSearch(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="svc-can-cat">Meal category</label>
              <select id="svc-can-cat" value={canteenCategory} onChange={(e) => setCanteenCategory(e.target.value)}>
                <option value="ALL">All Meal Categories</option>
                <option value="Breakfast">Breakfast</option>
                <option value="Lunch & Meals">Lunch & Meals</option>
                <option value="Snacks & Quick Bites">Snacks & Quick Bites</option>
                <option value="Beverages">Beverages</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="svc-can-diet">Dietary preference</label>
              <select id="svc-can-diet" value={canteenDietary} onChange={(e) => setCanteenDietary(e.target.value)}>
                <option value="ALL">All Dietary Preferences</option>
                <option value="Vegetarian">Vegetarian</option>
                <option value="Non-Vegetarian">Non-Vegetarian</option>
                <option value="Vegan">Vegan</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary">Filter Menu</button>
          </form>

          <h2 className="section-title">Daily Canteen Menu &amp; Pricing</h2>
          {!isLoading('canteen') && !errors.canteen && <p className="services__hint">Showing {canteenMenu.length} items</p>}
          {errorCard('canteen', loadCanteen)}
          {isLoading('canteen') ? (
            <div className="empty-state">Loading menu...</div>
          ) : errors.canteen ? null : (
            <DataCards
              rows={canteenMenu}
              keyOf={(item) => item.id}
              empty="No menu items found for the selected category."
              title={(item) => item.item_name}
              value={(item) => `Rs ${Number(item.price).toFixed(2)}`}
              meta={[
                { label: 'Category', render: (item) => item.category },
                {
                  label: 'Dietary',
                  render: (item) => (
                    <span className={`pill ${item.dietary === 'Vegetarian' || item.dietary === 'Vegan' ? 'pill--good' : 'pill--warn'}`}>
                      {item.dietary}
                    </span>
                  ),
                },
                { label: 'Serving', render: (item) => item.timings },
                {
                  label: 'Status',
                  render: (item) => (
                    <span className={`pill ${item.availability === 'Available' ? 'pill--good' : 'pill--bad'}`}>{item.availability}</span>
                  ),
                },
                {
                  label: 'Staff',
                  render: (item) =>
                    isStaff ? (
                      <button type="button" className="btn" disabled={busy} onClick={() => handleToggleAvailability(item.id, item.availability)}>
                        Mark {item.availability === 'Available' ? 'Sold Out' : 'Available'}
                      </button>
                    ) : null,
                },
              ]}
            />
          )}
        </>
      )}

      {/* 4. LOST AND FOUND */}
      {activeTab === 'lost_found' && (
        <>
          <form className="card services__form" onSubmit={submitOnEnter(loadLostFound)}>
            <div className="field">
              <label htmlFor="svc-lf-search">Search</label>
              <input
                id="svc-lf-search"
                type="text"
                placeholder="Title, description, or location"
                value={lfSearch}
                onChange={(e) => setLfSearch(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="svc-lf-type">Report type</label>
              <select id="svc-lf-type" value={lfTypeFilter} onChange={(e) => setLfTypeFilter(e.target.value)}>
                <option value="ALL">All Reports</option>
                <option value="Lost">Lost Items Only</option>
                <option value="Found">Found Items Only</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="svc-lf-cat">Category</label>
              <select id="svc-lf-cat" value={lfCategoryFilter} onChange={(e) => setLfCategoryFilter(e.target.value)}>
                <option value="ALL">All Categories</option>
                {LF_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="svc-lf-status">Status</label>
              <select id="svc-lf-status" value={lfStatusFilter} onChange={(e) => setLfStatusFilter(e.target.value)}>
                <option value="ALL">All Statuses</option>
                <option value="Open">Open</option>
                <option value="Claimed">Claimed</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary">Search</button>
            <div className="services__actions">
              <button type="button" className="btn" onClick={() => openReport('Lost')}>+ Report Lost Item</button>
              <button type="button" className="btn" onClick={() => openReport('Found')}>+ Report Found Item</button>
            </div>
          </form>

          <h2 className="section-title">Reported Items</h2>
          {errorCard('lf', loadLostFound)}
          {isLoading('lf') ? (
            <div className="empty-state">Loading reports...</div>
          ) : errors.lf ? null : (
            <DataCards
              rows={lostFoundItems}
              keyOf={(item) => item.id}
              empty="No lost or found items reported matching your filters."
              title={(item) => item.item_title}
              value={(item) => <span className={`pill ${item.status === 'Open' ? 'pill--warn' : 'pill--good'}`}>{item.status}</span>}
              meta={[
                {
                  label: 'Type',
                  render: (item) => (
                    <span className={`pill ${item.report_type === 'Lost' ? 'pill--bad' : 'pill--good'}`}>{item.report_type.toUpperCase()}</span>
                  ),
                },
                { label: 'Category', render: (item) => item.category },
                { label: 'Where', render: (item) => item.location_reported },
                { label: 'Date', render: (item) => item.date_reported },
                { label: 'Details', render: (item) => item.description },
                { label: 'Reporter', render: (item) => `${item.reporter_name} (${item.reporter_usn})` },
                { label: 'Claim', render: (item) => item.claim_instructions || 'Contact reporter directly.' },
                {
                  label: 'Inquiries',
                  render: (item) => (item.message_count > 0 ? <span className="services__flag">{item.message_count} inquiry message(s) received</span> : null),
                },
                {
                  label: 'Action',
                  render: (item) => (
                    <span className="services__actions">
                      <button type="button" className="btn btn-primary" onClick={() => openContactModal(item)}>
                        Contact / Inquire ({item.message_count || 0})
                      </button>
                      {item.status === 'Open' && (
                        <button type="button" className="btn" disabled={busy} onClick={() => handleUpdateStatus(item.id, 'Claimed')}>
                          Mark Claimed
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

      {/* 5. CAMPUS FACILITIES */}
      {activeTab === 'facilities' && (
        <>
          <form className="card services__form" onSubmit={submitOnEnter(loadFacilities)}>
            <div className="field">
              <label htmlFor="svc-fac-search">Search</label>
              <input
                id="svc-fac-search"
                type="text"
                placeholder="Name, building, equipment, or features"
                value={facilitySearch}
                onChange={(e) => setFacilitySearch(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="svc-fac-cat">Facility domain</label>
              <select id="svc-fac-cat" value={facilityCategory} onChange={(e) => setFacilityCategory(e.target.value)}>
                <option value="ALL">All Facility Domains</option>
                <option value="Laboratories">Laboratories</option>
                <option value="Sports & Fitness">Sports & Fitness</option>
                <option value="Medical & Health">Medical & Health</option>
                <option value="Auditoriums & Halls">Auditoriums & Halls</option>
                <option value="Amenities & Utilities">Amenities & Utilities</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary">Search</button>
          </form>

          <h2 className="section-title">Campus Facilities</h2>
          {errorCard('fac', loadFacilities)}
          {isLoading('fac') ? (
            <div className="empty-state">Loading facilities...</div>
          ) : errors.fac ? null : (
            <DataCards
              rows={facilities}
              keyOf={(fac) => fac.id}
              empty="No campus facilities found."
              title={(fac) => fac.facility_name}
              value={(fac) => <span className="pill pill--info">{fac.category}</span>}
              meta={[
                { label: 'Location', render: (fac) => fac.building_location },
                { label: 'About', render: (fac) => fac.description },
                { label: 'Hours', render: (fac) => fac.operating_hours },
                { label: 'In charge', render: (fac) => fac.in_charge_name },
                { label: 'Contact', render: (fac) => fac.contact_tel },
                {
                  label: 'Features',
                  render: (fac) =>
                    fac.key_features ? (
                      <span className="services__features">
                        {fac.key_features.split(',').map((feat, idx) => (
                          <span key={idx} className="pill">{feat.trim()}</span>
                        ))}
                      </span>
                    ) : null,
                },
              ]}
            />
          )}
        </>
      )}

      {showReportModal && (
        <Sheet title={`Report ${reportForm.report_type} Item to Campus Registry`} onClose={closeReport} onSubmit={handleCreateReport}>
          {dialogError && <div className="notice notice--bad" role="alert">{dialogError}</div>}
          <div className="field">
            <label htmlFor="svc-r-type">Report Type</label>
            <select id="svc-r-type" value={reportForm.report_type} onChange={reportField('report_type')}>
              <option value="Lost">Lost Item</option>
              <option value="Found">Found Item</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="svc-r-cat">Item Classification</label>
            <select id="svc-r-cat" value={reportForm.category} onChange={reportField('category')}>
              {LF_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="svc-r-title">Item Title &amp; Model</label>
            <input id="svc-r-title" type="text" placeholder="e.g. HP Wireless Mouse (Black)" required value={reportForm.item_title} onChange={reportField('item_title')} />
          </div>
          <div className="field">
            <label htmlFor="svc-r-loc">Location Where Lost / Found</label>
            <input id="svc-r-loc" type="text" placeholder="e.g. Systems Lab 3, Row 4" required value={reportForm.location_reported} onChange={reportField('location_reported')} />
          </div>
          <div className="field">
            <label htmlFor="svc-r-date">Date</label>
            <input id="svc-r-date" type="date" required value={reportForm.date_reported} onChange={reportField('date_reported')} />
          </div>
          <div className="field">
            <label htmlFor="svc-r-desc">Detailed Description &amp; Identifying Marks</label>
            <textarea id="svc-r-desc" rows="3" placeholder="Colour, identifying scratches, or content" required value={reportForm.description} onChange={reportField('description')} />
          </div>
          <div className="field">
            <label htmlFor="svc-r-name">Reporter Name</label>
            <input id="svc-r-name" type="text" required value={reportForm.reporter_name} onChange={reportField('reporter_name')} />
          </div>
          <div className="field">
            <label htmlFor="svc-r-usn">Reporter USN / ID</label>
            <input id="svc-r-usn" type="text" required value={reportForm.reporter_usn} onChange={reportField('reporter_usn')} />
          </div>
          <div className="field">
            <label htmlFor="svc-r-email">Contact Email</label>
            <input id="svc-r-email" type="email" required value={reportForm.contact_email} onChange={reportField('contact_email')} />
          </div>
          <div className="field">
            <label htmlFor="svc-r-phone">Contact Phone</label>
            <input id="svc-r-phone" type="text" required value={reportForm.contact_phone} onChange={reportField('contact_phone')} />
          </div>
          <div className="field">
            <label htmlFor="svc-r-claim">Claim / Retrieval Instructions</label>
            <input id="svc-r-claim" type="text" placeholder="e.g. Deposit with CS Lab attendant" value={reportForm.claim_instructions} onChange={reportField('claim_instructions')} />
          </div>
          <div className="sticky-actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>Submit Report</button>
            <button type="button" className="btn" onClick={closeReport}>Cancel</button>
          </div>
        </Sheet>
      )}

      {contactingItem && (
        <Sheet title={`Inquiry: ${contactingItem.item_title}`} onClose={closeContact} onSubmit={handleSendInquiry}>
          <p className="services__hint">
            Reported by <strong>{contactingItem.reporter_name}</strong> ({contactingItem.reporter_usn})
          </p>
          <dl className="services__info">
            <div><dt>Email</dt><dd>{contactingItem.contact_email}</dd></div>
            <div><dt>Phone</dt><dd>{contactingItem.contact_phone}</dd></div>
            <div><dt>Claim instructions</dt><dd>{contactingItem.claim_instructions || 'Contact reporter directly.'}</dd></div>
          </dl>
          <div className="services__label">In-Portal Inquiries &amp; Messages ({itemMessages.length})</div>
          {errors.messages && <ErrorCard error={errors.messages} onRetry={() => loadMessages(contactingItem)} />}
          <div className="services__thread">
            {itemMessages.length === 0 ? (
              <div className="empty-state">
                {isLoading('messages') ? 'Loading messages...' : 'No messages sent yet. Use the form below to message the reporter.'}
              </div>
            ) : (
              itemMessages.map((m) => (
                <div key={m.id} className="services__msg">
                  <div className="services__msg-head">
                    <strong>{m.sender_name} ({m.sender_usn})</strong>
                    <span>{m.sent_at}</span>
                  </div>
                  <p>{m.message}</p>
                </div>
              ))
            )}
          </div>
          {dialogNote && <div className="notice notice--good" role="status">{dialogNote}</div>}
          {dialogError && <div className="notice notice--bad" role="alert">{dialogError}</div>}
          <div className="field">
            <label htmlFor="svc-inquiry">Send a Message to Reporter</label>
            <textarea
              id="svc-inquiry" rows="3" required value={inquiryText}
              placeholder="Type your inquiry or update"
              onChange={(e) => setInquiryText(e.target.value)}
            />
          </div>
          <div className="sticky-actions">
            <button type="submit" className="btn btn-primary" disabled={busy || !inquiryText.trim()}>Send Message</button>
            <button type="button" className="btn" onClick={closeContact}>Cancel</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
