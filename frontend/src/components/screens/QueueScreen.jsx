import React, { useState, useEffect } from 'react';

export default function QueueScreen({ queueElapsed, handleLeaveQueue }) {
  const [dots, setDots] = useState([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const angle = Math.random() * 2 * Math.PI;
      const radius = 15 + Math.random() * 70; // radius percentage (15% to 85%)
      const x = 50 + radius * Math.cos(angle);
      const y = 50 + radius * Math.sin(angle);
      const id = Math.random().toString();
      
      setDots(prev => [...prev, { id, x, y }].slice(-5));
    }, 1200);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-center" style={{ flex: 1 }}>
      <style>{`
        @keyframes radar-sweep {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes radar-pulse {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 0; box-shadow: 0 0 0px var(--tertiary-cyan); }
          15% { transform: translate(-50%, -50%) scale(1.3); opacity: 1; box-shadow: 0 0 12px var(--tertiary-cyan); }
          30% { transform: translate(-50%, -50%) scale(1); opacity: 0.8; }
          100% { transform: translate(-50%, -50%) scale(0.6); opacity: 0; }
        }
      `}</style>

      <div className="glass-panel neo-border neo-shadow-cyan text-center" style={{ maxWidth: '500px', width: '90%', padding: '40px' }}>
        <div className="badge badge-cyan mb-6">Queued Operator</div>
        <h2 className="mb-4" style={{ fontSize: '28px' }}>SEARCHING OPPONENTS</h2>
        
        {/* Radar HUD Graphic */}
        <div
          style={{
            position: 'relative',
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            border: '2px solid rgba(0, 251, 251, 0.25)',
            background: 'radial-gradient(circle, rgba(0, 251, 251, 0.04) 0%, rgba(9, 6, 13, 0.85) 100%)',
            boxShadow: '0 0 25px rgba(0, 251, 251, 0.12), inset 0 0 15px rgba(0, 251, 251, 0.08)',
            margin: '30px auto',
            overflow: 'hidden',
          }}
        >
          {/* Concentric helper grids */}
          <div style={{ position: 'absolute', top: '25px', left: '25px', width: '150px', height: '150px', borderRadius: '50%', border: '1px dashed rgba(0, 251, 251, 0.12)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: '50px', left: '50px', width: '100px', height: '100px', borderRadius: '50%', border: '1px solid rgba(0, 251, 251, 0.08)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: '75px', left: '75px', width: '50px', height: '50px', borderRadius: '50%', border: '1px dashed rgba(0, 251, 251, 0.12)', pointerEvents: 'none' }} />
          
          {/* Axis crosshair lines */}
          <div style={{ position: 'absolute', top: '50%', left: 0, width: '100%', height: '1px', background: 'rgba(0, 251, 251, 0.06)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', left: '50%', top: 0, width: '1px', height: '100%', background: 'rgba(0, 251, 251, 0.06)', pointerEvents: 'none' }} />

          {/* Sweep Light Beam */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: 'conic-gradient(from 0deg at 50% 50%, rgba(0, 251, 251, 0.3) 0deg, rgba(0, 251, 251, 0.15) 30deg, transparent 180deg, transparent 360deg)',
              animation: 'radar-sweep 3s linear infinite',
              pointerEvents: 'none',
            }}
          />

          {/* Scanning Operator Signals */}
          {dots.map(dot => (
            <div
              key={dot.id}
              style={{
                position: 'absolute',
                left: `${dot.x}%`,
                top: `${dot.y}%`,
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: 'var(--tertiary-cyan)',
                transform: 'translate(-50%, -50%)',
                animation: 'radar-pulse 3s forwards',
              }}
            />
          ))}
        </div>

        <div style={{ fontSize: '16px', fontWeight: '800', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: '10px' }}>
          TIME ELAPSED: <span style={{ color: 'var(--tertiary-cyan)' }}>{queueElapsed}s</span>
        </div>
        <p style={{ color: 'var(--text-muted)', marginBottom: '32px', fontSize: '13px' }}>
          Scanning active players for matching opponent...
        </p>
        <button className="btn btn-secondary w-full" onClick={handleLeaveQueue}>
          Abort Search
        </button>
      </div>
    </div>
  );
}
