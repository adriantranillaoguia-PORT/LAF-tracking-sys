import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabase';
import ItemCard from './ItemCard';
import ItemForm from './ItemForm';
import Sidebar from './Sidebar';

/**
 * Main application component.
 * Manages data fetching, realtime subscriptions, auth sessions, and filtering.
 */
export default function App() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const [showReportForm, setShowReportForm] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'lost', 'found'
  const [statusFilter, setStatusFilter] = useState('open'); // 'open', 'claimed', 'all'

  // Fetch initial items list
  const fetchItems = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setItems(data || []);
    } catch (err) {
      setErrorMessage(`Failed to load items: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 1. Initial items load and realtime subscription
  useEffect(() => {
    fetchItems();

    // Listen to changes on the public:items table in real-time
    const channel = supabase
      .channel('public:items')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'items' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setItems((prev) => [
              payload.new,
              ...prev.filter((item) => item.id !== payload.new.id),
            ]);
          } else if (payload.eventType === 'UPDATE') {
            setItems((prev) =>
              prev.map((item) =>
                item.id === payload.new.id ? payload.new : item
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setItems((prev) =>
              prev.filter((item) => item.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    // Cleanup realtime channel on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Client-side filtering using useMemo
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Type filter
      if (typeFilter !== 'all' && item.kind !== typeFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }

      // Search query across name, description, category, and location
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const titleMatch = item.title?.toLowerCase().includes(query);
        const descMatch = item.description?.toLowerCase().includes(query);
        const catMatch = item.category?.toLowerCase().includes(query);
        const locMatch = item.location?.toLowerCase().includes(query);

        return titleMatch || descMatch || catMatch || locMatch;
      }

      return true;
    });
  }, [items, typeFilter, statusFilter, searchQuery]);

  return (
    <div className="app-shell">
      <Sidebar onReport={() => setShowReportForm(true)} />
      <div className="app-main">
        <div className="container client-container">
          <header className="client-header">
            <div className="client-header-copy">
              <div className="client-header-title-row">
                <span className="client-header-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="5" y="4" width="14" height="17" rx="2" />
                    <path d="M9 4.5h6M9 10h6M9 14h6M9 18h3" />
                  </svg>
                </span>
                <h1>Reported Items</h1>
              </div>
              <p>View and manage all lost and found items reported on campus.</p>
            </div>

          </header>

          <section className="client-help-card" aria-label="Lost and found help">
            <span className="client-help-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 8h14l1 13H4L5 8Z" />
                <path d="M9 8V6a3 3 0 0 1 6 0v2" />
              </svg>
            </span>
            <div className="client-help-copy">
              <h2>Lost something? Found something?</h2>
              <p>Help others by reporting it here!</p>
            </div>
            <div className="client-help-actions" id="client-help-actions">
              <button type="button" className="btn btn-primary" onClick={() => setShowReportForm(true)}>
                Report an Item
              </button>
            </div>
          </section>

          <div className="client-controls">
            <form className="client-search-box" onSubmit={(event) => event.preventDefault()} role="search">
              <span className="client-search-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="10.8" cy="10.8" r="6.8" />
                  <path d="m16 16 4.5 4.5" />
                </svg>
              </span>
              <input
                id="search-input"
                type="text"
                placeholder="Search by title, description, category, or location..."
                value={searchQuery}
                aria-label="Search reported items"
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button
                type="button"
                className="client-search-clear"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                disabled={!searchQuery}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="m6 6 12 12M18 6 6 18" />
                </svg>
              </button>
              <button type="submit" className="client-search-submit">Search</button>
            </form>

            <div className="client-toolbar-group">
              <select id="type-filter" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="all">All types</option>
                <option value="lost">Lost only</option>
                <option value="found">Found only</option>
              </select>
              <select id="status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="open">Open</option>
                <option value="claimed">Claimed</option>
                <option value="all">All statuses</option>
              </select>
            </div>
          </div>

          {errorMessage && (
            <div className="banner banner-error" role="alert">
              <span>{errorMessage}</span>
              <button
                type="button"
                className="btn btn-secondary btn-small"
                onClick={() => setErrorMessage(null)}
              >
                Dismiss
              </button>
            </div>
          )}

          {successMessage && (
            <div className="banner banner-success" role="status">
              <span>{successMessage}</span>
              <button
                type="button"
                className="btn btn-secondary btn-small"
                onClick={() => setSuccessMessage(null)}
              >
                Dismiss
              </button>
            </div>
          )}

          <main>
            {loading ? (
              <div className="state-container">
                <h2 className="state-title">Loading items...</h2>
                <p className="state-message">Connecting to the live database.</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="state-container">
                <h2 className="state-title">No items found</h2>
                <p className="state-message">
                  {searchQuery || typeFilter !== 'all' || statusFilter !== 'all'
                    ? 'No items match your active filters or search terms. Try clearing your filters, or be the first to report an item.'
                    : 'No items have been reported yet. If you have misplaced something or discovered a lost item, report it now to help reunite items with owners.'}
                </p>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                  {(searchQuery || typeFilter !== 'all' || statusFilter !== 'open') && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setSearchQuery('');
                        setTypeFilter('all');
                        setStatusFilter('open');
                      }}
                    >
                      Reset filters
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setShowReportForm(true)}
                  >
                    Report an item
                  </button>
                </div>
              </div>
            ) : (
              <section className="items-grid" aria-label="Reported items list">
                {filteredItems.map((item) => (
                  <ItemCard key={item.id} item={item} />
                ))}
              </section>
            )}
          </main>

          {showReportForm && (
            <ItemForm
              onSubmitted={() => {
                setShowReportForm(false);
                setSuccessMessage('Item report submitted successfully.');
                setTimeout(() => setSuccessMessage(null), 4000);
              }}
              onCancel={() => setShowReportForm(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
