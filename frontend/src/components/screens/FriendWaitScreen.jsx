import React, { useState } from 'react';

export default function FriendWaitScreen({ friendRoomCode, handleCancelFriendRoom }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (friendRoomCode) {
      navigator.clipboard.writeText(friendRoomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex-center" style={{ flex: 1 }}>
      <div className="glass-panel neo-border neo-shadow-magenta text-center" style={{ maxWidth: '500px', padding: '40px' }}>
        <div className="badge badge-magenta mb-6">Secured Channel</div>
        <h2 className="mb-4" style={{ fontSize: '24px' }}>WAITING FOR OPERATOR</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '12px' }}>
          SHARE THIS SECURED DECRYPTION KEY WITH YOUR COMBATANT
        </p>
        <div
          onClick={handleCopy}
          title="Click to copy room code"
          style={{
            fontSize: '32px',
            fontWeight: '900',
            fontFamily: 'var(--font-mono)',
            color: 'var(--secondary-magenta)',
            backgroundColor: 'var(--surface-lowest)',
            border: '2px dashed var(--secondary-magenta)',
            padding: '16px',
            letterSpacing: '0.2em',
            margin: '24px 0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(254, 0, 254, 0.05)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--surface-lowest)'; }}
        >
          <span>{friendRoomCode}</span>
          <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--text-muted)' }}>
            content_copy
          </span>
        </div>
        {copied ? (
          <p style={{ color: 'var(--primary-lime)', fontSize: '12px', margin: '-16px 0 24px 0', fontWeight: '800' }}>
            KEY COPIED TO SYSTEM CLIPBOARD!
          </p>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '11px', margin: '-16px 0 24px 0' }}>
            (TAP BOX TO COPY KEY)
          </p>
        )}
        <button className="btn btn-primary w-full" onClick={handleCancelFriendRoom}>
          Collapse Channel
        </button>
      </div>
    </div>
  );
}
