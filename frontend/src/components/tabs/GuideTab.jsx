import React, { useState, useEffect } from 'react';
import InteractiveTutorial from '../InteractiveTutorial';

export default function GuideTab({ autoStartOnboarding, onOnboardingComplete }) {
  const [activeTutorialMode, setActiveTutorialMode] = useState(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  useEffect(() => {
    if (autoStartOnboarding) {
      setTimeout(() => setShowWelcomeModal(true), 0);
    }
  }, [autoStartOnboarding]);

  return (
    <div style={{ maxWidth: '800px', width: '100%', margin: '0 auto', position: 'relative' }}>
      <h2 style={{ fontSize: '32px', color: 'var(--tertiary-cyan)', marginBottom: '32px', textAlign: 'center' }}>GAME GUIDE</h2>

      {/* Stacked Game Modes with Embedded Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '36px' }}>
        
        {/* Spot the Bug */}
        <div className="glass-panel neo-border" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 28px', borderRadius: '1.25rem', borderLeft: '4px solid var(--primary-lime)' }}>
          <div style={{ fontSize: '18px', fontWeight: '900', color: '#ffffff', letterSpacing: '0.05em' }}>
            SPOT THE BUG
          </div>
          <button 
            className="btn btn-primary" 
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', fontSize: '14px', fontWeight: '800' }}
            onClick={() => setActiveTutorialMode(1)}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px', fontWeight: '900' }}>play_arrow</span>
            SEE HOW!
          </button>
        </div>

        {/* Binary Bash */}
        <div className="glass-panel neo-border" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 28px', borderRadius: '1.25rem', borderLeft: '4px solid var(--secondary-magenta)' }}>
          <div style={{ fontSize: '18px', fontWeight: '900', color: '#ffffff', letterSpacing: '0.05em' }}>
            BINARY BASH
          </div>
          <button 
            className="btn btn-secondary" 
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', fontSize: '14px', fontWeight: '800' }}
            onClick={() => setActiveTutorialMode(2)}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px', fontWeight: '900' }}>play_arrow</span>
            SEE HOW!
          </button>
        </div>

        {/* Circuit Grid */}
        <div className="glass-panel neo-border" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 28px', borderRadius: '1.25rem', borderLeft: '4px solid var(--tertiary-cyan)' }}>
          <div style={{ fontSize: '18px', fontWeight: '900', color: '#ffffff', letterSpacing: '0.05em' }}>
            CIRCUIT GRID
          </div>
          <button 
            className="btn btn-tertiary" 
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', fontSize: '14px', fontWeight: '800' }}
            onClick={() => setActiveTutorialMode(3)}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px', fontWeight: '900' }}>play_arrow</span>
            SEE HOW!
          </button>
        </div>

      </div>

      {/* Gate Operations Reference Table */}
      <div className="glass-panel neo-border" style={{ padding: '30px', marginBottom: '30px' }}>
        <h4 style={{ fontSize: '18px', color: 'var(--tertiary-cyan)', marginBottom: '18px', letterSpacing: '0.05em' }}>
          BOOLEAN GATE OPERATIONS REFERENCE
        </h4>
        <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--surface-high)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '12px 8px' }}>Operation</th>
              <th style={{ padding: '12px 8px' }}>Logic Description</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid var(--surface-high)' }}>
              <td style={{ padding: '12px 8px', fontWeight: '800', color: 'var(--primary-lime)' }}>AND</td>
              <td style={{ padding: '12px 8px' }}>Outputs 1 only if all inputs are 1</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--surface-high)' }}>
              <td style={{ padding: '12px 8px', fontWeight: '800', color: 'var(--secondary-magenta)' }}>OR</td>
              <td style={{ padding: '12px 8px' }}>Outputs 1 if at least one input is 1</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--surface-high)' }}>
              <td style={{ padding: '12px 8px', fontWeight: '800', color: 'var(--primary-lime)' }}>XOR</td>
              <td style={{ padding: '12px 8px' }}>Outputs 1 only if inputs are different</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--surface-high)' }}>
              <td style={{ padding: '12px 8px', fontWeight: '800', color: 'var(--secondary-magenta)' }}>XNOR</td>
              <td style={{ padding: '12px 8px' }}>Outputs 1 only if both the inputs are same</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--surface-high)' }}>
              <td style={{ padding: '12px 8px', fontWeight: '800', color: 'var(--primary-lime)' }}>NAND / NOR</td>
              <td style={{ padding: '12px 8px' }}>Inverted outputs of AND / OR operations</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Onboarding Welcome Modal */}
      {showWelcomeModal && (
        <div
          className="flex-center"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(9, 6, 13, 0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 10500,
          }}
        >
          <div
            className="glass-panel neo-border neo-shadow-lime"
            style={{
              maxWidth: '480px',
              width: '90%',
              padding: '36px',
              textAlign: 'center',
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <span className="material-symbols-outlined text-5xl" style={{ color: 'var(--primary-lime)', fontSize: '56px' }}>
                videogame_asset
              </span>
            </div>

            <h3 style={{ fontSize: '22px', color: '#ffffff', marginBottom: '16px', letterSpacing: '0.05em' }}>
              QUICK GAME GUIDE
            </h3>

            <p style={{ color: 'var(--text-primary)', fontSize: '14px', lineHeight: '1.6', marginBottom: '32px' }}>
              Before playing, take this 30 seconds guide to the game. HIGHLY RECOMMENDED!
            </p>

            <div style={{ display: 'flex', gap: '16px', flexDirection: 'column' }}>
              <button
                className="btn btn-primary w-full"
                onClick={() => {
                  setShowWelcomeModal(false);
                  setActiveTutorialMode(1);
                }}
              >
                Start the Guide
              </button>
              <button
                className="btn btn-ghost w-full"
                onClick={() => {
                  setShowWelcomeModal(false);
                  onOnboardingComplete?.();
                }}
              >
                Skip and Browse Instead
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Onboarding Tutorial Overlay Modal */}
      {activeTutorialMode !== null && (
        <InteractiveTutorial
          activeMode={activeTutorialMode}
          onClose={() => {
            setActiveTutorialMode(null);
            onOnboardingComplete?.();
          }}
          onCompleteMode={() => {
            setActiveTutorialMode(null);
            onOnboardingComplete?.();
          }}
        />
      )}
    </div>
  );
}
