import React from 'react';

export default function GuideTab() {
  return (
    <div style={{ maxWidth: '900px', width: '100%', margin: '0 auto' }}>
      <h2 style={{ fontSize: '32px', color: 'var(--tertiary-cyan)', marginBottom: '32px' }}>PLAYER HANDBOOK</h2>

      <div className="glass-panel neo-border" style={{ padding: '30px', marginBottom: '30px' }}>
        <h3 style={{ fontSize: '22px', marginBottom: '14px', color: '#ffffff' }}>System Objective</h3>
        <p style={{ lineHeight: '1.7', color: 'var(--text-primary)' }}>
          Logic Arena tests your thinking speed across Boolean operations. Combat features three game domains representing distinct computational challenges.
        </p>
      </div>

      <div className="grid-container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
        <div className="glass-panel neo-border" style={{ padding: '24px' }}>
          <h4 style={{ fontSize: '18px', color: 'var(--primary-lime)', marginBottom: '10px' }}>[ SPOT THE BUG ]</h4>
          <p style={{ fontSize: '13px', lineHeight: '1.6' }}>
            Inspect the logical circuit. Tap on the malfunctioning logic gate (the one producing the incorrect output value) to repair the system.
          </p>
        </div>
        <div className="glass-panel neo-border" style={{ padding: '24px' }}>
          <h4 style={{ fontSize: '18px', color: 'var(--secondary-magenta)', marginBottom: '10px' }}>[ BINARY BASH ]</h4>
          <p style={{ fontSize: '13px', lineHeight: '1.6' }}>
            Trace the inputs through the logic circuit. Calculate and submit the final output value (0 or 1) as fast as possible to win.
          </p>
        </div>
      </div>

      <div className="glass-panel neo-border" style={{ padding: '30px' }}>
        <h4 style={{ fontSize: '18px', color: 'var(--tertiary-cyan)', marginBottom: '14px' }}>[ CIRCUIT GRID ]</h4>
        <p style={{ fontSize: '13px', lineHeight: '1.6', marginBottom: '20px' }}>
          Complete the interconnected circuit grid (crossword). Drag components from your inventory and drop them into the correct blank slots. Each gate has its own inputs and outputs clearly marked with arrows.
        </p>
        <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--surface-high)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '8px' }}>Operation</th>
              <th style={{ padding: '8px' }}>Logic Description</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid var(--surface-high)' }}>
              <td style={{ padding: '8px', fontWeight: '800' }}>AND</td>
              <td style={{ padding: '8px' }}>Outputs 1 only if all inputs are 1.</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--surface-high)' }}>
              <td style={{ padding: '8px', fontWeight: '800' }}>OR</td>
              <td style={{ padding: '8px' }}>Outputs 1 if at least one input is 1.</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--surface-high)' }}>
              <td style={{ padding: '8px', fontWeight: '800' }}>XOR</td>
              <td style={{ padding: '8px' }}>Outputs 1 only if inputs are different.</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--surface-high)' }}>
              <td style={{ padding: '8px', fontWeight: '800' }}>NAND/NOR</td>
              <td style={{ padding: '8px' }}>Inverted outputs of AND/OR.</td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  );
}
