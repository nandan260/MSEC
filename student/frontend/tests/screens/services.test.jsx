import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

vi.mock('../../src/api', async () => {
  class NetworkError extends Error {}
  return { apiRequest: vi.fn(), apiUrl: (p) => p, NetworkError };
});

import { apiRequest, NetworkError } from '../../src/api';
import CampusServicesView from '../../src/screens/ServicesScreen.jsx';

const routes = [
  {
    id: 1, route_number: 'R1', start_point: 'Yelahanka', end_point: 'Campus', bus_number: 'KA-01-1234', status: 'On Time',
    current_demo_location: 'Near Hebbal Flyover', demo_speed_kmh: 32, driver_name: 'Suresh', driver_phone: '98450 11111',
    stops: [
      { stop_number: 1, stop_name: 'Yelahanka', morning_time: '07:00', evening_time: '17:30', status: 'Passed', time: '07:05 AM' },
      { stop_number: 2, stop_name: 'Hebbal Flyover', morning_time: '07:20', evening_time: '17:10', status: 'Current' },
    ],
  },
  { id: 2, route_number: 'R2', start_point: 'Jayanagar', end_point: 'Campus', bus_number: 'KA-02', status: 'Delayed', current_demo_location: 'Lalbagh', demo_speed_kmh: 20, driver_name: 'Ravi', driver_phone: '1', stops: [] },
];
const menu = [
  { id: 5, item_name: 'Masala Dosa', category: 'Breakfast', dietary: 'Vegetarian', timings: '8-11 AM', price: 40, availability: 'Available' },
  { id: 6, item_name: 'Chicken Roll', category: 'Snacks & Quick Bites', dietary: 'Non-Vegetarian', timings: 'All day', price: 70, availability: 'Sold Out' },
];
const items = [
  { id: 9, report_type: 'Lost', item_title: 'Blue Bottle', category: 'Personal Items', location_reported: 'Lab 3', date_reported: '2026-11-01', description: 'Steel bottle', reporter_name: 'Asha', reporter_usn: '1MS21CS001', contact_email: 'a@x.edu', contact_phone: '123', claim_instructions: '', status: 'Open', message_count: 2 },
];

beforeEach(() => {
  apiRequest.mockReset();
  apiRequest.mockImplementation(async (url, opts) => {
    if (opts?.method) return { message: 'Done' };
    if (url.startsWith('/services/bus-routes')) return { routes, tracking_disclaimer: 'Demo only' };
    if (url.startsWith('/services/canteen')) return { info: { name: 'Food Court', location: 'Plaza', opening_hours: '8-8', breakfast_timings: '8-10', lunch_timings: '12-2', payment_methods: 'UPI', contact: 'x' }, menu: url.includes('dietary=Vegan') ? [] : menu };
    if (url.includes('/messages')) return { messages: [{ id: 1, sender_name: 'Bob', sender_usn: '1MS', sent_at: 'today', message: 'I have it' }] };
    if (url.startsWith('/services/lost-found')) return { items };
    if (url.startsWith('/services/facilities')) return { facilities: [{ id: 3, facility_name: 'Gym', category: 'Sports & Fitness', building_location: 'Arena', description: 'Fitness', operating_hours: '6-9', in_charge_name: 'Mr B', contact_tel: '55', key_features: 'Treadmills, Weights' }] };
    return {};
  });
});

describe('CampusServicesScreen', () => {
  it('bus tab renders route, telematics, stops with the current stop flagged; switching route works', async () => {
    render(<CampusServicesView userRole="student" />);
    expect(await screen.findByText('R1 - Yelahanka to Campus')).toBeInTheDocument();
    expect(screen.getByText(/Demo only/)).toBeInTheDocument();
    expect(screen.getByText('32 km/h')).toBeInTheDocument();
    expect(screen.getByText('Hebbal Flyover')).toBeInTheDocument();
    expect(screen.getByText('Bus Currently Here')).toBeInTheDocument();
    expect(screen.getByText('07:05 AM')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'R2: Jayanagar to Campus' }));
    expect(screen.getByText('R2 - Jayanagar to Campus')).toBeInTheDocument();
    expect(document.querySelector('table')).toBeNull();
  });

  it('map tab lists buildings, filters by search and shows details on select', async () => {
    render(<CampusServicesView userRole="student" />);
    await screen.findByText('R1 - Yelahanka to Campus');
    fireEvent.click(screen.getByRole('tab', { name: 'Campus Map' }));
    expect(screen.getAllByText('Department of Computer Science & Engineering').length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText('Search buildings'), { target: { value: 'library' } });
    expect(screen.queryByRole('button', { name: /Main Administrative Block/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Central University Library/ }));
    expect(screen.getByText('Dr. Meenakshi Sundaram (Chief Librarian)')).toBeInTheDocument();
  });

  it('canteen renders menu; dietary filter requests the filtered list; staff toggle is hidden for students', async () => {
    render(<CampusServicesView userRole="student" />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Canteen' }));
    expect(await screen.findByText('Masala Dosa')).toBeInTheDocument();
    expect(screen.getByText('Rs 40.00')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Mark/ })).toBeNull();
    fireEvent.change(screen.getByLabelText('Dietary preference'), { target: { value: 'Vegan' } });
    expect(await screen.findByText('No menu items found for the selected category.')).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledWith('/services/canteen?dietary=Vegan&');
  });

  it('faculty toggles canteen availability with a PUT payload', async () => {
    render(<CampusServicesView userRole="faculty" />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Canteen' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Mark Sold Out' }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/services/canteen/5/availability', { method: 'PUT', body: JSON.stringify({ availability: 'Sold Out' }) }));
    expect(await screen.findByText('Done')).toBeInTheDocument();
  });

  it('ignores a late canteen response from an older filter', async () => {
    const pending = {};
    apiRequest.mockImplementation((url) => new Promise((resolve) => { pending[url] = resolve; }));
    render(<CampusServicesView userRole="student" />);
    fireEvent.click(screen.getByRole('tab', { name: 'Canteen' }));
    await waitFor(() => expect(pending['/services/canteen?']).toBeTruthy());
    fireEvent.change(screen.getByLabelText('Dietary preference'), { target: { value: 'Vegan' } });
    pending['/services/canteen?dietary=Vegan&']({ menu: [menu[1]] });
    expect(await screen.findByText('Chicken Roll')).toBeInTheDocument();
    pending['/services/canteen?']({ menu: [menu[0]] });
    await Promise.resolve();
    await Promise.resolve();
    expect(screen.queryByText('Masala Dosa')).toBeNull();
  });

  it('lost & found: cards, report posts the full payload, status claim', async () => {
    render(<CampusServicesView userRole="student" />);
    fireEvent.click(await screen.findByRole('tab', { name: /Lost & Found/ }));
    expect(await screen.findByText('Blue Bottle')).toBeInTheDocument();
    expect(screen.getByText('2 inquiry message(s) received')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mark Claimed' }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/services/lost-found/9/status', { method: 'PUT', body: JSON.stringify({ status: 'Claimed' }) }));

    fireEvent.click(screen.getByRole('button', { name: '+ Report Found Item' }));
    expect(screen.getByLabelText('Report Type')).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '+ Report Found Item' }));
    fireEvent.change(screen.getByLabelText(/Item Title/), { target: { value: 'Keys' } });
    fireEvent.change(screen.getByLabelText(/Location Where/), { target: { value: 'Gate 1' } });
    fireEvent.change(screen.getByLabelText(/Detailed Description/), { target: { value: 'Two keys' } });
    fireEvent.submit(screen.getByRole('dialog').querySelector('form'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    const call = apiRequest.mock.calls.find(([u, o]) => u === '/services/lost-found' && o?.method === 'POST');
    const body = JSON.parse(call[1].body);
    expect(body).toMatchObject({ report_type: 'Found', item_title: 'Keys', category: 'Personal Items', location_reported: 'Gate 1', description: 'Two keys', reporter_name: 'Alex Kumar', reporter_usn: '1MS21CS084', contact_email: 'student@college.edu', contact_phone: '+91 98765 43210' });
  });

  it('inquiry dialog loads the thread and sends a trimmed message', async () => {
    render(<CampusServicesView userRole="student" />);
    fireEvent.click(await screen.findByRole('tab', { name: /Lost & Found/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Contact \/ Inquire/ }));
    expect(await screen.findByText('I have it')).toBeInTheDocument();
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Send a Message to Reporter'), { target: { value: '  Is it mine?  ' } });
    fireEvent.submit(dialog.querySelector('form'));
    await waitFor(() => expect(apiRequest.mock.calls.some(([u, o]) => u === '/services/lost-found/9/message' && o?.method === 'POST')).toBe(true));
    const call = apiRequest.mock.calls.find(([u, o]) => u === '/services/lost-found/9/message' && o?.method === 'POST');
    expect(JSON.parse(call[1].body)).toEqual({ sender_name: 'Alex Kumar', sender_usn: '1MS21CS084', sender_contact: '+91 98765 43210', message: 'Is it mine?' });
    expect(await within(dialog).findByText('Done')).toBeInTheDocument();
  });

  it('facilities render with feature pills', async () => {
    render(<CampusServicesView userRole="student" />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Facilities' }));
    expect(await screen.findByText('Gym')).toBeInTheDocument();
    expect(screen.getByText('Treadmills')).toBeInTheDocument();
    expect(screen.getByText('Weights')).toBeInTheDocument();
  });

  it('shows ErrorCard and retry refetches', async () => {
    apiRequest.mockRejectedValueOnce(new NetworkError('down'));
    render(<CampusServicesView userRole="student" />);
    expect(await screen.findByText("Can't reach the server")).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('R1 - Yelahanka to Campus')).toBeInTheDocument();
  });
});
