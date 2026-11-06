import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

afterEach(cleanup);

import { NetworkError } from '../src/api.js';
import ErrorCard from '../src/components/ErrorCard.jsx';
import DataCards from '../src/components/DataCards.jsx';

describe('ErrorCard', () => {
  it('shows the offline message and calls onRetry once when Retry is clicked', () => {
    const onRetry = vi.fn();
    render(<ErrorCard error={new NetworkError()} onRetry={onRetry} />);
    expect(screen.getByText("Can't reach the server")).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('treats a raw TypeError (e.g. "Failed to fetch") as a network error', () => {
    render(<ErrorCard error={new TypeError('Failed to fetch')} onRetry={() => {}} />);
    expect(screen.getByText("Can't reach the server")).toBeInTheDocument();
    expect(screen.queryByText('Failed to fetch')).not.toBeInTheDocument();
  });

  it('shows error.message for other errors', () => {
    render(<ErrorCard error={new Error('Invalid credentials')} />);
    expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
  });

  it('omits the Retry button when onRetry is not given', () => {
    render(<ErrorCard error={new NetworkError()} />);
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });
});

describe('DataCards', () => {
  const rows = [
    { id: 1, name: 'Algorithms', code: 'CS301', room: 'A1' },
    { id: 2, name: 'Databases', code: 'CS302', room: null },
    { id: 3, name: 'Networks', code: 'CS303', room: '' },
  ];

  it('renders one .card per row', () => {
    const { container } = render(<DataCards rows={rows} title={(r) => r.name} />);
    expect(container.querySelectorAll('.card')).toHaveLength(3);
    expect(screen.getByText('Databases')).toHaveClass('truncate');
  });

  it('renders value next to the title and meta as label/value pairs, skipping empty values', () => {
    const { container } = render(
      <DataCards
        rows={rows}
        title={(r) => r.name}
        value={(r) => `#${r.id}`}
        meta={[
          { label: 'Room', render: (r) => r.room },
          { label: 'Code', render: (r) => r.code },
        ]}
      />
    );
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('A1')).toBeInTheDocument();
    // Room is null for row 2 and '' for row 3, so only the Code label appears for those cards
    expect(screen.getAllByText('Room')).toHaveLength(1);
    expect(screen.getAllByText('Code')).toHaveLength(3);
    expect(container.querySelectorAll('.card')).toHaveLength(3);
  });

  it('uses the empty prop for the empty state, defaulting to "Nothing here yet"', () => {
    const { container, rerender } = render(<DataCards rows={[]} title={(r) => r.name} />);
    expect(container.querySelector('.empty-state')).toHaveTextContent('Nothing here yet');
    rerender(<DataCards rows={[]} title={(r) => r.name} empty="No courses" />);
    expect(container.querySelector('.empty-state')).toHaveTextContent('No courses');
  });

  it('makes cards keyboard-activatable buttons when onRowClick is given', () => {
    const onRowClick = vi.fn();
    render(<DataCards rows={rows} title={(r) => r.name} onRowClick={onRowClick} />);
    const cards = screen.getAllByRole('button');
    expect(cards).toHaveLength(3);
    expect(cards[0]).toHaveAttribute('tabindex', '0');
    fireEvent.click(cards[1]);
    expect(onRowClick).toHaveBeenLastCalledWith(rows[1]);
    fireEvent.keyDown(cards[2], { key: 'Enter' });
    expect(onRowClick).toHaveBeenLastCalledWith(rows[2]);
    fireEvent.keyDown(cards[0], { key: ' ' });
    expect(onRowClick).toHaveBeenLastCalledWith(rows[0]);
    expect(onRowClick).toHaveBeenCalledTimes(3);
  });
});
