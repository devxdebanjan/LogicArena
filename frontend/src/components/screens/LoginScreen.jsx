import React, { useEffect } from 'react';

export default function LoginScreen({ handleGuestLogin, handleGoogleAuthSuccess, showAlert }) {
  useEffect(() => {
    let intervalId;
    const initGsi = () => {
      if (window.google) {
        try {
          window.google.accounts.id.initialize({
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '825946115984-7aep42cahpl5h6iie8ldkpe50302m9qg.apps.googleusercontent.com',
            callback: (response) => {
              if (handleGoogleAuthSuccess) {
                handleGoogleAuthSuccess(response.credential);
              }
            }
          });
          const container = document.getElementById('google-login-btn-container');
          if (container) {
            window.google.accounts.id.renderButton(
              container,
              { theme: 'dark', size: 'large', text: 'signin_with', width: 320 }
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
    if (!window.google) {
      intervalId = setInterval(() => {
        if (window.google) {
          initGsi();
        }
      }, 300);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [handleGoogleAuthSuccess]);

  return (
    <div
      className="flex-center"
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(circle, #211d2d 0%, #0f0c14 100%)',
        padding: '20px'
      }}
    >
      <div
        className="glass-panel neo-border neo-shadow-lime"
        style={{
          maxWidth: '500px',
          width: '100%',
          padding: '40px',
          textAlign: 'center'
        }}
      >
        <h1
          style={{
            fontSize: '42px',
            fontStyle: 'italic',
            color: 'var(--primary-lime)',
            textShadow: '0 0 10px rgba(195, 244, 0, 0.4)',
            marginBottom: '10px'
          }}
        >
          LOGICARENA
        </h1>
        <p className="logo-subtitle" style={{ fontSize: '11px', color: 'var(--secondary-magenta)', marginBottom: '32px' }}>
          [ PORTAL TO BOOLEAN COMBAT ]
        </p>

        <p style={{ color: 'var(--text-primary)', fontWeight: '600', marginBottom: '32px', fontSize: '14px', lineHeight: '1.6' }}>
          System ready. Link guest credentials or sign in with Google logic cores to synchronize ELO records.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <button className="btn btn-primary w-full" onClick={handleGuestLogin}>
            <span className="material-symbols-outlined">key</span> Enter Guest Mode
          </button>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4px' }}>
            <div id="google-login-btn-container" style={{ minHeight: '40px' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
