import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useNavigate } from 'react-router-dom';
import { clearDemoSession } from './demoAuth';
import { supabase } from './supabase';

function SidebarIcon({ name }) {
  const paths = {
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9M9 20v-6h6v6" /></>,
    report: <><path d="M12 5v14M5 12h14" /></>,
    grid: <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></>,
    user: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></>,
    bag: <><path d="M5 8h14l1 13H4L5 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /><path d="M9 13h.01M15 13h.01" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
  };

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

export default function Sidebar({
  admin = false,
  onReport,
  activeView = 'all',
  onViewChange,
  counts = { lost: 0, found: 0, claimed: 0, clientLogins: 0 },
}) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [clientEmail, setClientEmail] = useState('');
  const [logoutTarget, setLogoutTarget] = useState(null);

  useEffect(() => {
    if (admin) return;

    setLogoutTarget(document.getElementById('client-help-actions'));
  }, [admin]);

  useEffect(() => {
    if (admin) return;

    let active = true;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (active) setClientEmail(user?.email || '');
    });

    return () => {
      active = false;
    };
  }, [admin]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.warn('Supabase sign-out failed.', error);
    }

    clearDemoSession();
    navigate(admin ? '/admin/login' : '/login', { replace: true });
  };

  const handleAdminViewChange = (nextView) => {
    if (onViewChange) {
      onViewChange(nextView);
    }
    setMenuOpen(false);
  };

  return (
    <aside className={`sidebar ${admin ? 'sidebar-admin' : ''} ${menuOpen ? 'sidebar-menu-open' : ''}`}>
      <div className="sidebar-top">
        <div className="sidebar-brand">
          <span className="sidebar-mark">
            <img src="/cpsu-seal.svg" alt="Lost and Found Tracking System logo" />
          </span>
          <div className="sidebar-brand-copy">
            <strong>CPSU</strong>
            <span>Lost and Found</span>
            <span>Tracking System</span>
          </div>
        </div>
        <button
          type="button"
          className="sidebar-menu-toggle"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={menuOpen}
          aria-controls="sidebar-navigation"
        >
          <SidebarIcon name={menuOpen ? 'close' : 'menu'} />
        </button>
      </div>

      <div className="sidebar-menu-content" id="sidebar-navigation">
        {admin ? (
          <nav className="sidebar-nav sidebar-admin-nav" aria-label="Workspace">
            <span className="sidebar-label">Workspace</span>

            <div className="sidebar-admin-group">
              <button
                type="button"
                className={`sidebar-link ${activeView === 'all' ? 'active' : ''}`}
                onClick={() => handleAdminViewChange('all')}
              >
                <span className="sidebar-icon"><SidebarIcon name="grid" /></span>
                <span>Reported Items</span>
              </button>

              <div className="sidebar-subnav" aria-label="Reported item filters">
                <button
                  type="button"
                  className={`sidebar-sub-link sidebar-sub-link-lost ${activeView === 'lost' ? 'active' : ''}`}
                  onClick={() => handleAdminViewChange('lost')}
                >
                  <span className="sidebar-dot sidebar-dot-lost" aria-hidden="true" />
                  <span>Lost</span>
                  <span className="sidebar-count">{counts.lost}</span>
                </button>

                <button
                  type="button"
                  className={`sidebar-sub-link sidebar-sub-link-found ${activeView === 'found' ? 'active' : ''}`}
                  onClick={() => handleAdminViewChange('found')}
                >
                  <span className="sidebar-dot sidebar-dot-found" aria-hidden="true" />
                  <span>Found</span>
                  <span className="sidebar-count">{counts.found}</span>
                </button>
              </div>
            </div>

            <div className="sidebar-admin-group">
              <button
                type="button"
                className="sidebar-link"
                onClick={() => handleAdminViewChange('claimed')}
              >
                <span className="sidebar-icon"><SidebarIcon name="bag" /></span>
                <span>History of Lost and Found</span>
              </button>

              <div className="sidebar-subnav" aria-label="Claimed item filters">
                <button
                  type="button"
                  className={`sidebar-sub-link sidebar-sub-link-claimed ${activeView === 'claimed' ? 'active' : ''}`}
                  onClick={() => handleAdminViewChange('claimed')}
                >
                  <span className="sidebar-dot sidebar-dot-claimed" aria-hidden="true" />
                  <span>Claimed</span>
                  <span className="sidebar-count">{counts.claimed}</span>
                </button>

                <button
                  type="button"
                  className={`sidebar-sub-link sidebar-sub-link-client-logins ${activeView === 'client-logins' ? 'active' : ''}`}
                  onClick={() => handleAdminViewChange('client-logins')}
                >
                  <span className="sidebar-dot sidebar-dot-client-logins" aria-hidden="true" />
                  <span>Client Log In History</span>
                  <span className="sidebar-count">{counts.clientLogins ?? 0}</span>
                </button>
              </div>
            </div>
          </nav>
        ) : (
          <nav className="sidebar-nav" aria-label="Main navigation">
            <span className="sidebar-label">Workspace</span>
            <NavLink to="/home" end onClick={() => setMenuOpen(false)} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <span className="sidebar-icon"><SidebarIcon name="home" /></span>
              Browse Items
            </NavLink>
            <button type="button" className="sidebar-link sidebar-action" onClick={() => { onReport(); setMenuOpen(false); }}>
              <span className="sidebar-icon"><SidebarIcon name="report" /></span>
              Report an Item
            </button>
          </nav>
        )}

        <div className="sidebar-footer">
          <div className="sidebar-role">
            <span className="sidebar-avatar" aria-hidden="true"><SidebarIcon name="user" /></span>
            <div>
              <strong>{admin ? 'Administrator' : clientEmail || 'Client Account'}</strong>
              <span>{admin ? 'Manage reports' : 'Signed in'}</span>
            </div>
          </div>
        </div>
      </div>
      {!admin && logoutTarget && createPortal(
        <button type="button" className="sidebar-logout" onClick={handleLogout}>
          <span className="sidebar-icon"><SidebarIcon name="logout" /></span>
          Sign Out
        </button>,
        logoutTarget
      )}
    </aside>
  );
}
