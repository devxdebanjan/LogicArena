import React, { useEffect } from 'react';

export default function ProfileTab({
  user,
  displayNameInput,
  setDisplayNameInput,
  handleUpdateProfile,
  handleGoogleAuthSuccess
}) {
  useEffect(() => {
    let intervalId;
    const initGsi = () => {
      if (window.google && user?.is_guest) {
        try {
          window.google.accounts.id.initialize({
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '825946115984-7aep42cahpl5h6iie8ldkpe50302m9qg.apps.googleusercontent.com',
            callback: (response) => {
              if (handleGoogleAuthSuccess) {
                handleGoogleAuthSuccess(response.credential);
              }
            }
          });
          const container = document.getElementById('google-signin-btn-container');
          if (container) {
            window.google.accounts.id.renderButton(
              container,
              { theme: 'dark', size: 'large', text: 'signin_with', width: 280 }
            );
            if (intervalId) clearInterval(intervalId);
          }
        } catch (err) {
          console.error('Failed to render Google GSI button:', err);
        }
      }
    };

    // Try immediately
    initGsi();

    // Poll if google script is still loading
    if (!window.google && user?.is_guest) {
      intervalId = setInterval(() => {
        if (window.google) {
          initGsi();
        }
      }, 300);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [user?.is_guest, handleGoogleAuthSuccess]);

  return (
    <div style={{ maxWidth: '800px', width: '100%', margin: '0 auto' }}>
      <h2 style={{ fontSize: '32px', color: 'var(--primary-lime)', marginBottom: '32px' }}>OPERATOR CARD</h2>

      <div className="glass-panel neo-border" style={{ padding: '30px', marginBottom: '30px' }}>
        <form onSubmit={handleUpdateProfile} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="input-container" style={{ flex: 1, margin: 0, minWidth: '220px' }}>
            <span className="input-label">Display Name</span>
            <input
              type="text"
              className="input-field"
              placeholder="SET A CUSTOM DISPLAY NAME..."
              value={displayNameInput}
              onChange={(e) => setDisplayNameInput(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ height: '52px' }}>
            Save
          </button>
        </form>
      </div>

      <div className="tab-responsive-grid">
        {/* Stats Bento Box */}
        <div className="glass-panel neo-border tab-col-6" style={{ padding: '24px', borderLeft: '4px solid var(--primary-lime)' }}>
          <h3 style={{ fontSize: '16px', color: 'var(--primary-lime)', marginBottom: '20px' }}>Match Analytics</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>GAMES PLAYED</span>
              <span style={{ fontWeight: '800' }}>{user?.games_played}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>GAMES WON</span>
              <span style={{ fontWeight: '800' }}>{user?.games_won}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>WIN RATIO</span>
              <span style={{ fontWeight: '800' }}>
                {user?.games_played > 0
                  ? `${Math.round((user.games_won / user.games_played) * 100)}%`
                  : '0%'
                }
              </span>
            </div>
          </div>
        </div>

        <div className="glass-panel neo-border tab-col-6" style={{ padding: '24px', borderLeft: '4px solid var(--secondary-magenta)' }}>
          <h3 style={{ fontSize: '16px', color: 'var(--secondary-magenta)', marginBottom: '20px' }}>Player Ratings</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>CURRENT RATING</span>
              <span style={{ fontWeight: '800', color: 'var(--tertiary-cyan)' }}>{user?.elo} ELO</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>BEST STREAK</span>
              <span style={{ fontWeight: '800' }}>{user?.best_streak} Days</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>ACCOUNT STATUS</span>
              <span style={{ fontWeight: '800', color: user?.is_guest ? 'var(--primary-lime)' : 'var(--tertiary-cyan)' }}>
                {user?.is_guest ? 'GUEST NODE' : 'SECURED MEMBER'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {user?.is_guest ? (
        <div className="glass-panel neo-border text-center" style={{ padding: '30px', marginTop: '30px', borderLeft: '4px solid var(--secondary-magenta)' }}>
          <h3 style={{ fontSize: '18px', color: 'var(--secondary-magenta)', marginBottom: '12px' }}>SECURE YOUR PROGRESS</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '13px', lineHeight: '1.6' }}>
            Guest progress is temporary and stored locally. Connect a Google Account to secure your Elo ratings, streaks, and crossword rankings permanently in the cloud.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div id="google-signin-btn-container" style={{ minHeight: '40px' }} />
          </div>
        </div>
      ) : (
        <div className="glass-panel neo-border text-center" style={{ padding: '24px', marginTop: '30px', borderLeft: '4px solid var(--primary-lime)', backgroundColor: 'rgba(195,244,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--primary-lime)', fontWeight: 'bold', fontSize: '15px' }}>
            <span className="material-symbols-outlined">verified_user</span>
            <span>ACCOUNT SECURED BY GOOGLE</span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '6px', fontFamily: 'var(--font-mono)' }}>
            Google Subject ID: Linked
          </p>
        </div>
      )}
    </div>
  );
}
