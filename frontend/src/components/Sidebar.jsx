import React, { useState } from 'react';

export default function Sidebar({ activeTab, setActiveTab, user, onLogout, showAlert }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const tabs = [
    { id: 'arena', label: 'Arena', icon: 'sports_esports' },
    { id: 'daily', label: 'Daily', icon: 'event_note' },
    { id: 'guide', label: 'Guide', icon: 'help_outline' },
    { id: 'profile', label: 'Profile', icon: 'account_circle' }
  ];

  return (
    <>
      {/* Mobile Top Header (only visible on mobile) */}
      <div className="mobile-header">
        <div className="logo-text">LOGIC<span style={{ color: 'var(--primary-lime)' }}>ARENA</span></div>
        <button className="hamburger-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          <span className="material-symbols-outlined">{mobileMenuOpen ? 'close' : 'menu'}</span>
        </button>
      </div>

      {/* Sidebar Navigation Panel (Desktop and Mobile drawer) */}
      <aside className={`sidebar-nav ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <h1 className="logo-title">LOGIC<span style={{ color: 'var(--primary-lime)' }}>ARENA</span></h1>
          <p className="logo-subtitle">Boolean Logic</p>
        </div>

        {/* User Card */}
        {user && (
          <div className="sidebar-user-card neo-border">
            <div className="user-info" style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div className="user-name" title={user.display_name || user.username} style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.display_name || user.username}
                </div>
                {user.is_guest && (
                  <span
                    className="material-symbols-outlined"
                    style={{
                      color: 'var(--secondary-magenta)',
                      fontSize: '18px',
                      cursor: 'pointer',
                      display: 'inline-block'
                    }}
                    title="Guest Account: Progress is local. Click to sync."
                    onClick={() => {
                      if (showAlert) {
                        showAlert(
                          "This guest account's progress (ELO, history, and streak) is stored locally. Sign in with a Google Account on the Profile tab to securely synchronize your progress to the cloud.",
                          "GUEST ACCOUNT SYNC"
                        );
                      } else {
                        alert("This guest account's progress is stored locally. Sign in with Google on the Profile tab to sync.");
                      }
                    }}
                  >
                    error
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <span className="user-elo">Elo: {user.elo}</span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <nav className="nav-links">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab(tab.id);
                  setMobileMenuOpen(false);
                }}
              >
                <span className="material-symbols-outlined">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom Utility Area */}
        <div className="sidebar-footer">
          {user && (
            <button className="nav-item logout-btn" onClick={onLogout} style={{ width: '100%' }}>
              <span className="material-symbols-outlined">logout</span>
              <span>Logout</span>
            </button>
          )}
          {/* <div className="footer-stubs">
            <a href="#" className="footer-link"><span className="material-symbols-outlined text-sm">settings</span> Settings</a>
            <a href="#" className="footer-link"><span className="material-symbols-outlined text-sm">contact_support</span> Support</a>
          </div> */}
        </div>
      </aside>

      {/* Styles for responsive layout */}
      <style>{`
        /* Sidebar Layout styling */
        .sidebar-nav {
          width: 260px;
          height: 100vh;
          position: fixed;
          left: 0;
          top: 0;
          background-color: var(--surface-lowest);
          border-right: 2px solid var(--surface-highest);
          display: flex;
          flex-direction: column;
          padding: 32px 24px;
          z-index: 1000;
          transition: transform 0.3s ease;
        }

        .sidebar-logo {
          margin-bottom: 32px;
        }
        .logo-title {
          font-size: 28px;
          font-style: italic;
          color: #ffffff;
          text-shadow: 0 0 10px rgba(195, 244, 0, 0.4);
          line-height: 1;
        }
        .logo-subtitle {
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.25em;
          color: var(--secondary-magenta);
          margin-top: 6px;
        }

        .sidebar-user-card {
          background-color: var(--surface-low);
          border: 2px solid #000000;
          box-shadow: 3px 3px 0px 0px #000000;
          padding: 14px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          border-radius: 12px;
        }
        .user-name {
          font-weight: 800;
          font-size: 14px;
          color: #ffffff;
          max-width: 140px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .user-elo {
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--tertiary-cyan);
          font-weight: bold;
          margin-top: 2px;
        }
        @keyframes pulse-warn {
          0% { opacity: 0.65; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.15); }
          100% { opacity: 0.65; transform: scale(1); }
        }

        .nav-links {
          display: flex;
          flex-direction: column;
          gap: 10px;
          flex: 1;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 14px 18px;
          color: var(--text-primary);
          font-weight: 800;
          text-transform: uppercase;
          font-size: 13px;
          letter-spacing: 0.05em;
          cursor: pointer;
          border: 2px solid transparent;
          transition: all 0.2s ease;
          width: 100%;
          text-align: left;
          border-radius: 12px;
        }
        .nav-item:hover:not(.active) {
          background-color: rgba(195, 244, 0, 0.1);
          border-color: var(--primary-lime);
          color: var(--primary-lime);
        }
        .nav-item.active {
          background-color: var(--primary-lime);
          color: var(--on-primary);
          border: 2px solid #000000;
          box-shadow: 4px 4px 0px 0px #000000;
          border-radius: 12px;
        }
        .nav-item.logout-btn {
          color: var(--secondary-magenta-dim);
        }
        .nav-item.logout-btn:hover {
          background-color: rgba(254, 0, 254, 0.05);
          border-color: var(--secondary-magenta);
        }

        .sidebar-footer {
          margin-top: auto;
          display: flex;
          flex-direction: column;
          gap: 20px;
          border-t: 1px solid var(--surface-highest);
          padding-top: 20px;
        }
        .footer-stubs {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
        }
        .footer-link {
          color: var(--text-muted);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .footer-link:hover {
          color: #ffffff;
        }

        /* Mobile Layout rules */
        .mobile-header {
          display: none;
        }

        @media (max-width: 1024px) {
          .mobile-header {
            display: flex;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 70px;
            background-color: var(--surface-lowest);
            border-bottom: 2px solid var(--surface-highest);
            padding: 0 20px;
            align-items: center;
            justify-content: space-between;
            z-index: 1010;
          }
          .mobile-header .logo-text {
            font-family: var(--font-display);
            font-weight: 900;
            font-size: 20px;
            font-style: italic;
          }
          .hamburger-btn {
            color: #ffffff;
            cursor: pointer;
          }
          
          .sidebar-nav {
            transform: translateX(-100%);
            top: 70px;
            height: calc(100vh - 70px);
            width: 100%;
            border-right: none;
            border-bottom: 2px solid var(--surface-highest);
          }
          .sidebar-nav.open {
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
}
