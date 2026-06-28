import React from 'react';

export default function LoadingScreen({ message = 'SYNCHRONIZING WITH DATABASE...' }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(15, 12, 20, 0.95)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        fontFamily: 'var(--font-mono)',
        color: 'var(--primary-lime)',
      }}
    >
      {/* Animated Cyberpunk spinner block */}
      <div
        style={{
          width: '60px',
          height: '60px',
          border: '4px solid var(--surface-highest)',
          borderTop: '4px solid var(--primary-lime)',
          borderRight: '4px solid var(--secondary-magenta)',
          animation: 'spin 1s linear infinite',
          marginBottom: '24px',
        }}
      />
      
      {/* Flashing terminal sync label */}
      <div
        style={{
          fontWeight: '800',
          fontSize: '14px',
          letterSpacing: '0.15em',
          textAlign: 'center',
          padding: '0 20px',
          animation: 'pulse 1.5s infinite ease-in-out',
        }}
      >
        [ {message} ]
      </div>

      {/* Embedded local keyframe helpers */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; text-shadow: 0 0 8px var(--primary-lime); }
        }
      `}</style>
    </div>
  );
}
