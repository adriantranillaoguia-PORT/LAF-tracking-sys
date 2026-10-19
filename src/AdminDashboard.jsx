import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { adminSupabase as supabase } from './supabase';
import ItemThumb from './ItemThumb';
import ItemDetailsModal from './ItemDetailsModal';
import Sidebar from './Sidebar';
import { clearDemoSession } from './demoAuth';
import { getStoragePathFromPublicUrl } from '../lib/uploadImage';
import { STORAGE_BUCKET } from './storageConfig';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [pendingAction, setPendingAction] = useState(null);
  const [confirmItem, setConfirmItem] = useState(null);
  const [detailsItem, setDetailsItem] = useState(null);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [clientLogins, setClientLogins] = useState([]);
  const [clientLoginTotal, setClientLoginTotal] = useState(0);
  const [clientLoginSearch, setClientLoginSearch] = useState('');
  const [clientLoginDateFilter, setClientLoginDateFilter] = useState('all');
  const [clientLoginVisibleCount, setClientLoginVisibleCount] = useState(20);
  const [clientLoginLoading, setClientLoginLoading] = useState(true);

  const activeView = useMemo(() => {
    const requestedView = searchParams.get('view');
    const requestedType = searchParams.get('type');

    if (requestedView === 'client-logins') return 'client-logins';
    if (requestedView === 'claimed') return 'claimed';
    if (requestedType === 'lost') return 'lost';
    if (requestedType === 'found') return 'found';
    return 'all';
  }, [searchParams]);

  const statusFilter = activeView === 'claimed' ? 'claimed' : activeView === 'client-logins' ? 'all' : 'open';

  const counts = useMemo(() => {
    return {
      lost: items.filter((item) => item.status === 'open' && item.kind === 'lost').length,
      found: items.filter((item) => item.status === 'open' && item.kind === 'found').length,
      claimed: items.filter((item) => item.status === 'claimed').length,
      clientLogins: clientLoginTotal,
    };
  }, [items, clientLoginTotal]);

  const setActiveView = (nextView) => {
    const nextParams = new URLSearchParams(searchParams);

    if (nextView === 'all') {
      nextParams.delete('type');
      nextParams.delete('view');
    } else if (nextView === 'claimed') {
      nextParams.delete('type');
      nextParams.set('view', 'claimed');
    } else if (nextView === 'client-logins') {
      nextParams.delete('type');
      nextParams.set('view', 'client-logins');
    } else {
      nextParams.delete('view');
      nextParams.set('type', nextView);
    }

    setSearchParams(nextParams, { replace: true });
  };

  useEffect(() => {
    let active = true;

    const syncSession = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('Admin session check failed.', sessionError);
      }

      if (!session?.user) {
        navigate('/admin/login', {
          replace: true,
          state: { message: 'Your session expired. Please sign in again.' },
        });
        return;
      }

      const { data: adminRow, error: adminError } = await supabase
        .from('admins')
        .select('user_id')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (adminError) {
        console.error('Admin lookup failed.', adminError);
      }

      if (!adminRow) {
        if (active) {
          navigate('/admin/login', {
            replace: true,
            state: { message: 'Your account does not have admin permission.' },
          });
        }
        return;
      }

      if (active) {
        setSessionInfo({
          id: session.user.id,
          email: session.user.email,
        });
      }
    };

    syncSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        navigate('/admin/login', {
          replace: true,
          state: { message: 'Your session expired. Please sign in again.' },
        });
        return;
      }

      supabase
        .from('admins')
        .select('user_id')
        .eq('user_id', session.user.id)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error) {
            console.error('Admin lookup failed during auth change.', error);
          }

          if (!data) {
            navigate('/admin/login', {
              replace: true,
              state: { message: 'Your account does not have admin permission.' },
            });
            return;
          }

          setSessionInfo({
            id: session.user.id,
            email: session.user.email,
          });
        });
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const loadItems = async () => {
    const { data, error: loadError } = await supabase
      .from('items')
      .select('*')
      .order('created_at', { ascending: false });

    if (loadError) {
      setError(loadError.message);
      return;
    }

    setItems(data || []);
    setLoading(false);
  };

  const filteredItems = useMemo(() => {
    const matches = items.filter((item) => {
      if (activeView === 'claimed') {
        if (item.status !== 'claimed') return false;
      } else {
        if (item.status !== 'open') return false;
        if (activeView !== 'all' && item.kind !== activeView) return false;
      }

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      const haystack = [
        item.title,
        item.description,
        item.category,
        item.location,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });

    if (activeView === 'claimed') {
      return [...matches].sort((a, b) => {
        const aClaimed = a.claimed_at ? new Date(a.claimed_at).getTime() : 0;
        const bClaimed = b.claimed_at ? new Date(b.claimed_at).getTime() : 0;
        return bClaimed - aClaimed;
      });
    }

    return matches;
  }, [items, searchQuery, activeView]);

  const filteredClientLogins = useMemo(() => {
    const query = clientLoginSearch.trim().toLowerCase();
    const now = new Date();
    const oneDayMs = 24 * 60 * 60 * 1000;

    return [...clientLogins]
      .filter((entry) => {
        const haystack = `${entry.full_name || ''} ${entry.email || ''}`.toLowerCase();
        if (query && !haystack.includes(query)) return false;

        if (clientLoginDateFilter === 'today') {
          const loggedInAt = entry.logged_in_at ? new Date(entry.logged_in_at) : null;
          if (!loggedInAt || loggedInAt.toDateString() !== now.toDateString()) return false;
        }

        if (clientLoginDateFilter === '7d') {
          const loggedInAt = entry.logged_in_at ? new Date(entry.logged_in_at) : null;
          if (!loggedInAt) return false;
          const difference = now.getTime() - loggedInAt.getTime();
          if (difference < 0 || difference > 7 * oneDayMs) return false;
        }

        return true;
      })
      .sort((a, b) => new Date(b.logged_in_at || 0) - new Date(a.logged_in_at || 0));
  }, [clientLogins, clientLoginSearch, clientLoginDateFilter]);

  const loadClientLoginHistory = async (showLoading = false) => {
    if (showLoading) setClientLoginLoading(true);

    const { count, error: countError } = await supabase
      .from('client_login_history')
      .select('id', { count: 'exact', head: true });

    if (countError) {
      console.error('Unable to count client login history.', countError);
      setClientLoginLoading(false);
      return;
    }

    const allLogins = [];
    const pageSize = 500;
    let offset = 0;

    while (true) {
      const { data, error: loginError } = await supabase
        .from('client_login_history')
        .select('*')
        .order('logged_in_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (loginError) {
        console.error('Unable to load client login history.', loginError);
        setClientLoginLoading(false);
        return;
      }

      allLogins.push(...(data || []));
      if (!data || data.length < pageSize) break;
      offset += pageSize;
    }

    setClientLoginTotal(count || 0);
    setClientLogins(allLogins);
    setClientLoginLoading(false);
    setClientLoginVisibleCount(20);
  };

  useEffect(() => {
    loadItems();

    const channel = supabase
      .channel('admin-items')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, loadItems)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  useEffect(() => {
    loadClientLoginHistory(true);

    const channel = supabase
      .channel('admin-client-login-history')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'client_login_history' }, () => {
        loadClientLoginHistory();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  useEffect(() => {
    if (!toast) return undefined;

    const timeoutId = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(timeoutId);
  }, [toast]);

  const updateStatus = async (id) => {
    if (pendingAction) return;

    setPendingAction({ type: 'claim', id });
    setError('');

    try {
      const claimedAt = new Date().toISOString();
      const { data, error: updateError } = await supabase
        .from('items')
        .update({ status: 'claimed', claimed_at: claimedAt })
        .eq('id', id)
        .select('id');

      if (updateError) throw updateError;
      if (!data || data.length === 0) {
        console.error('Admin claim update affected 0 rows.', {
          itemId: id,
          user: sessionInfo,
        });
        throw new Error('Your account does not have admin permission.');
      }

      setItems((previous) =>
        previous.map((item) =>
          item.id === id ? { ...item, status: 'claimed', claimed_at: claimedAt } : item
        )
      );
      setToast('Item marked as claimed');
    } catch (updateFailure) {
      console.error('Admin claim failed.', {
        itemId: id,
        session: sessionInfo,
        error: updateFailure,
      });

      const hasSession = Boolean(sessionInfo?.id);
      setError(
        hasSession
          ? (updateFailure.message || 'Your account does not have admin permission.')
          : 'Your session expired. Please sign in again.'
      );
    } finally {
      setPendingAction(null);
    }
  };

  const restoreItem = async (id) => {
    if (pendingAction) return;

    setPendingAction({ type: 'restore', id });
    setError('');

    try {
      const { data, error: restoreError } = await supabase
        .from('items')
        .update({ status: 'open', claimed_at: null })
        .eq('id', id)
        .select('id');

      if (restoreError) throw restoreError;
      if (!data || data.length === 0) {
        throw new Error('Item could not be restored.');
      }

      setItems((previous) =>
        previous.map((item) =>
          item.id === id ? { ...item, status: 'open', claimed_at: null } : item
        )
      );
      setToast('Item restored to open list');
    } catch (restoreFailure) {
      console.error('Restore failed.', restoreFailure);
      setError(restoreFailure.message || 'Unable to restore item.');
    } finally {
      setPendingAction(null);
    }
  };

  const deleteItem = async (item) => {
    if (!item || pendingAction) return;

    setPendingAction({ type: 'delete', id: item.id });
    setError('');
    setConfirmItem(null);

    try {
      const photoUrl = item.photo_url || item.image_url;
      let storageWarning = '';

      if (photoUrl) {
        const filePath = getStoragePathFromPublicUrl(photoUrl);
        if (filePath) {
          const { error: storageError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .remove([filePath]);

          if (storageError) {
            console.warn('Image cleanup failed:', storageError.message);
            storageWarning = 'The report was deleted, but the photo could not be removed from storage.';
          }
        }
      }

      const { data, error: deleteError } = await supabase
        .from('items')
        .delete()
        .eq('id', item.id)
        .select('id');

      if (deleteError) throw deleteError;
      if (!data || data.length === 0) {
        console.error('Admin delete affected 0 rows.', {
          itemId: item.id,
          user: sessionInfo,
          error: deleteError,
        });
        throw new Error('Your account does not have admin permission.');
      }

      setItems((previous) => previous.filter((current) => current.id !== item.id));
      setToast('Item deleted');

      if (storageWarning) {
        setError(storageWarning);
      }
    } catch (deleteFailure) {
      console.error('Admin delete failed.', {
        itemId: item.id,
        session: sessionInfo,
        error: deleteFailure,
      });

      const hasSession = Boolean(sessionInfo?.id);
      setError(
        hasSession
          ? (deleteFailure.message || 'Your account does not have admin permission.')
          : 'Your session expired. Please sign in again.'
      );
    } finally {
      setPendingAction(null);
    }
  };

  const logout = async () => {
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
    } catch (signOutError) {
      setError(signOutError.message || 'Unable to sign out. Please try again.');
      return;
    }

    clearDemoSession();
    navigate('/admin/login', { replace: true });
  };

  const isClaimedView = activeView === 'claimed';
  const isClientLoginsView = activeView === 'client-logins';

  const parseUserAgent = (userAgent) => {
    if (!userAgent) return 'Unknown device';

    const normalized = userAgent.toLowerCase();
    let browser = 'Unknown browser';
    let operatingSystem = 'Unknown OS';

    if (normalized.includes('edg')) browser = 'Edge';
    else if (normalized.includes('chrome') && !normalized.includes('opr')) browser = 'Chrome';
    else if (normalized.includes('opr')) browser = 'Opera';
    else if (normalized.includes('firefox')) browser = 'Firefox';
    else if (normalized.includes('safari')) browser = 'Safari';

    if (normalized.includes('windows')) operatingSystem = 'Windows';
    else if (normalized.includes('macintosh') || normalized.includes('mac os')) operatingSystem = 'macOS';
    else if (normalized.includes('android')) operatingSystem = 'Android';
    else if (normalized.includes('iphone') || normalized.includes('ipad')) operatingSystem = 'iOS';
    else if (normalized.includes('linux')) operatingSystem = 'Linux';

    return `${browser} on ${operatingSystem}`;
  };

  const visibleClientLogins = filteredClientLogins.slice(0, clientLoginVisibleCount);

  return (
    <div className="app-shell admin-shell">
      <div className="admin-workspace-layout">
        <Sidebar
          admin
          activeView={activeView}
          onViewChange={setActiveView}
          counts={counts}
        />
        <main className="app-main admin-page">
          <div className="container admin-container" id="admin-main">
            <header className="top-bar admin-top-bar">
              <div className="admin-header-copy">
                <p className="auth-kicker admin-kicker">Administration</p>
                <h1>{isClientLoginsView ? 'Client Log In History' : isClaimedView ? 'Claimed items' : 'Reported items'}</h1>
                <p className="admin-subtitle">
                  {isClientLoginsView
                    ? 'See when clients signed in to the tracker.'
                    : isClaimedView
                      ? 'View the full history of all claimed lost and found reports.'
                      : 'View and manage all lost and found items reported on campus.'}
                </p>
              </div>
              <div className="header-actions admin-actions">
                <button type="button" className="btn btn-primary btn-signout" onClick={logout}>Sign out</button>
              </div>
            </header>

            {error && <div className="banner banner-error" role="alert">{error}</div>}
            {toast && <div className="banner banner-success" role="status">{toast}</div>}

            {!isClientLoginsView && (
              <div className="admin-toolbar" role="search">
                <div className="admin-search-wrap">
                  <span className="admin-search-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="10.8" cy="10.8" r="6.8" />
                      <path d="m16 16 4.5 4.5" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search by title, description, category, or location..."
                    aria-label="Search items"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="admin-search-clear"
                      onClick={() => setSearchQuery('')}
                      aria-label="Clear search"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                        <path d="m6 6 12 12M18 6 6 18" />
                      </svg>
                    </button>
                  )}
                </div>

                {!isClaimedView && (
                  <div className="admin-filter-group">
                    <select value={statusFilter} aria-label="Status filter" onChange={() => {}}>
                      <option value="open">Open</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            {isClientLoginsView ? (
              <>
                <div className="admin-login-tools" role="search">
                  <input
                    type="text"
                    value={clientLoginSearch}
                    onChange={(event) => setClientLoginSearch(event.target.value)}
                    placeholder="Search by name or email"
                    aria-label="Search client logins"
                  />

                  <select
                    value={clientLoginDateFilter}
                    onChange={(event) => setClientLoginDateFilter(event.target.value)}
                    aria-label="Filter client login dates"
                  >
                    <option value="all">All</option>
                    <option value="today">Today</option>
                    <option value="7d">Last 7 days</option>
                  </select>
                </div>

                {clientLoginLoading ? (
                  <div className="state-container">
                    <h2>Loading client logins...</h2>
                  </div>
                ) : filteredClientLogins.length === 0 ? (
                  <div className="state-container">
                    <h2>No client logins recorded yet.</h2>
                  </div>
                ) : (
                  <>
                    <div className="admin-login-table-wrap">
                      <table className="admin-login-table" aria-label="Client login history table">
                        <thead>
                          <tr>
                            <th>Client</th>
                            <th>Date</th>
                            <th>Time</th>
                            <th>Device/Browser</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visibleClientLogins.map((entry) => {
                            const loginDate = new Date(entry.logged_in_at);
                            return (
                              <tr key={entry.id}>
                                <td className="admin-login-client-cell">
                                  <strong>{entry.full_name || 'Unknown user'}</strong>
                                  <span>{entry.email}</span>
                                </td>
                                <td>{loginDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                                <td>{loginDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</td>
                                <td>{parseUserAgent(entry.user_agent)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {visibleClientLogins.length < filteredClientLogins.length && (
                      <div className="admin-login-load-more-wrap">
                        <button
                          type="button"
                          className="btn btn-secondary admin-login-load-more"
                          onClick={() => setClientLoginVisibleCount((count) => count + 20)}
                        >
                          Load more
                        </button>
                      </div>
                    )}
                  </>
                )}
              </>
            ) : loading ? (
              <div className="state-container">
                <h2>Loading items...</h2>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="state-container">
                <h2>{isClaimedView ? 'No claimed items yet.' : 'No items match'}</h2>
              </div>
            ) : (
              <section className="admin-items" id="reported-items" aria-label="Reported items">
                {filteredItems.map((item) => {
                  const itemKind = item.kind === 'lost' ? 'lost' : 'found';
                  const claimedDate = item.claimed_at ? new Date(item.claimed_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  }) : null;

                  return (
                    <article className="admin-item" key={item.id}>
                      <div className="admin-item-main">
                        <ItemThumb
                          imageUrl={item.photo_url || item.image_url || null}
                          title={item.title}
                          className="admin-item-thumb"
                        />

                        <div className="admin-item-copy">
                          <h2>{item.title}</h2>
                          <p className="admin-item-meta">
                            <span className={`admin-kind-badge ${itemKind === 'lost' ? 'admin-kind-lost' : 'admin-kind-found'}`}>
                              {itemKind === 'lost' ? 'LOST' : 'FOUND'}
                            </span>
                            <span>{item.category}</span>
                            <span className="meta-separator">·</span>
                            <span>{item.location}</span>
                          </p>
                          <p className="admin-item-description">{item.description || 'No description provided.'}</p>
                        </div>
                      </div>

                      <div className="admin-item-actions">
                        <button type="button" className="item-open-button" onClick={() => setDetailsItem(item)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" />
                            <circle cx="12" cy="12" r="2.5" />
                          </svg>
                          View Details
                        </button>

                        {isClaimedView ? (
                          <>
                            <span className="admin-status-badge admin-status-claimed">Claimed</span>
                            {claimedDate && <span className="admin-claimed-date">{claimedDate}</span>}
                            <button
                              type="button"
                              className="btn btn-secondary btn-small"
                              onClick={() => restoreItem(item.id)}
                              disabled={pendingAction && pendingAction.id === item.id}
                            >
                              {pendingAction && pendingAction.id === item.id && pendingAction.type === 'restore'
                                ? 'Restoring...'
                                : 'Restore'}
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-secondary btn-small"
                            onClick={() => updateStatus(item.id)}
                            disabled={pendingAction && pendingAction.id === item.id}
                          >
                            {pendingAction && pendingAction.id === item.id && pendingAction.type === 'claim'
                              ? 'Updating...'
                              : 'Mark Claimed'}
                          </button>
                        )}

                        <button
                          type="button"
                          className="btn btn-danger btn-small"
                          onClick={() => setConfirmItem(item)}
                          disabled={pendingAction && pendingAction.id === item.id}
                        >
                          {pendingAction && pendingAction.id === item.id && pendingAction.type === 'delete'
                            ? 'Deleting...'
                            : 'Delete'}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </section>
            )}
          </div>
        </main>
      </div>

      {confirmItem && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-delete-title">
          <div className="modal-content">
            <div className="modal-header">
              <h2 id="confirm-delete-title" className="modal-title">Delete report</h2>
              <button
                type="button"
                className="btn btn-secondary btn-small"
                onClick={() => setConfirmItem(null)}
                disabled={pendingAction !== null}
              >
                Cancel
              </button>
            </div>

            <p className="admin-confirm-copy">
              Delete <strong>{confirmItem.title}</strong>? This cannot be undone.
            </p>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setConfirmItem(null)}
                disabled={pendingAction !== null}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => deleteItem(confirmItem)}
                disabled={pendingAction !== null}
              >
                Delete item
              </button>
            </div>
          </div>
        </div>
      )}
      {detailsItem && <ItemDetailsModal item={detailsItem} onClose={() => setDetailsItem(null)} isAdmin supabaseClient={supabase} />}
    </div>
  );
}
