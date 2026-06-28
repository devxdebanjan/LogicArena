import React from 'react';

export default function CountdownScreen({ user, opponentName, countdownNum }) {
  return (
    <div className="flex-center" style={{ flex: 1 }}>
      <div className="glass-panel neo-border neo-shadow-lime text-center" style={{ maxWidth: '500px', padding: '40px' }}>
        <div className="badge badge-lime mb-6">Duel Lock</div>
        <h2 className="mb-2" style={{ fontSize: '28px' }}>OPPONENT FOUND</h2>
        <p style={{ color: 'var(--text-primary)', fontWeight: '800', marginBottom: '24px' }}>
          {user?.display_name || user?.username} vs {opponentName}
        </p>
        <div style={{ fontSize: '96px', fontWeight: '900', color: 'var(--primary-lime)', animation: 'pulse 1s infinite' }}>
          {countdownNum}
        </div>
      </div>
    </div>
  );
}
