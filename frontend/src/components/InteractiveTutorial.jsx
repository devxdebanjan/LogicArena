import React, { useState, useEffect, useRef } from 'react';
import CircuitRenderer from './CircuitRenderer';

// Mock circuit data stored in frontend (correct Out IDs)
const mockMode1Circuit = {
  inputs: { In1: "1", In2: "0", In3: "1" },
  gates: [
    { id: "G1", type: "XOR", inputs: ["In1", "In2"] },
    { id: "G2", type: "AND", inputs: ["Out1", "In3"] }
  ],
  wire_values: {
    In1: 1, In2: 0, In3: 1,
    Out1: 1, // XOR(1, 0) = 1 (Correct)
    Out2: 0  // AND(1, 1) should be 1, but outputs 0 (Malfunctioning Gate - "G2" is the bug!)
  }
};

const mockMode2Circuit = {
  inputs: { In1: "1", In2: "1" },
  gates: [
    { id: "G1", type: "XOR", inputs: ["In1", "In2"] },
    { id: "G2", type: "AND", inputs: ["Out1", "In1"] }
  ],
  wire_values: {
    In1: 1, In2: 1,
    Out1: 0, // XOR(1, 1) = 0
    Out2: 0  // AND(0, 1) = 0 (Correct answer is "0")
  }
};

const playTutorialSound = (type) => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'correct') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.45);
    } else if (type === 'select') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    }
  } catch (e) {
    console.warn(e);
  }
};

export default function InteractiveTutorial({ activeMode, onClose, onCompleteMode }) {
  const [mode, setMode] = useState(activeMode || 1); // 1 | 2 | 3
  const [step, setStep] = useState(1);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Mode 3 crossword state
  const [gridAnswers, setGridAnswers] = useState({ C2: '', C4: '0' });
  const [ANDQty, setANDQty] = useState(1);
  const [oneQty, setOneQty] = useState(1);
  const [zeroQty, setZeroQty] = useState(0);
  const [draggingItem, setDraggingItem] = useState(null); // 'AND' | '1' | '0' | null

  const containerRef = useRef(null);
  const [pointerCoords, setPointerCoords] = useState(null);
  const [pointerDirection, setPointerDirection] = useState('down');

  // Recalculate pointer coordinates dynamically based on targeted elements
  const updatePointer = () => {
    if (!containerRef.current || isSuccess) {
      setPointerCoords(null);
      return;
    }

    let targetSelector = '';
    let direction = 'down';

    if (mode === 1) {
      if (step === 1) {
        // Point UP from below G2 (AND gate)
        targetSelector = '#gate-node-G2';
        direction = 'up';
      }
    } else if (mode === 2) {
      if (step === 1) {
        // Point right (from left side) towards target choice "0"
        targetSelector = '#output-choice-0';
        direction = 'left';
      }
    } else if (mode === 3) {
      if (step === 1) {
        if (draggingItem === 'AND') {
          targetSelector = '#tutorial-cell-C2';
          direction = 'down';
        } else {
          targetSelector = '#tutorial-inv-AND';
          direction = 'down';
        }
      } else if (step === 2) {
        targetSelector = '#tutorial-cell-C4';
        direction = 'down2';
      } else if (step === 3) {
        if (draggingItem === '1') {
          targetSelector = '#tutorial-cell-C4';
          direction = 'down';
        } else {
          targetSelector = '#tutorial-inv-1';
          direction = 'down';
        }
      }
    }

    if (!targetSelector) {
      setPointerCoords(null);
      return;
    }

    const targetEl = document.querySelector(targetSelector);
    if (!targetEl) {
      // Retry in a short delay if DOM isn't ready
      setTimeout(updatePointer, 120);
      return;
    }

    const targetRect = targetEl.getBoundingClientRect();
    const parentRect = containerRef.current.getBoundingClientRect();

    let top = 0;
    let left = 0;

    if (direction === 'down') {
      top = targetRect.top - parentRect.top - 62;
      left = targetRect.left - parentRect.left;
    } else if (direction === 'down2') {
      top = targetRect.top - parentRect.top - 62;
      left = targetRect.left - parentRect.left - 40;
    } else if (direction === 'up') {
      top = targetRect.bottom - parentRect.top + 8;
      left = targetRect.left - parentRect.left - 40;
    } else if (direction === 'left') {
      top = targetRect.top - parentRect.top + targetRect.height / 2 - 20;
      left = targetRect.left - parentRect.left - 130;
    }

    setPointerCoords({ top, left });
    setPointerDirection(direction);
  };

  useEffect(() => {
    updatePointer();
    window.addEventListener('resize', updatePointer);

    return () => {
      window.removeEventListener('resize', updatePointer);
    };
  }, [mode, step, isSuccess, gridAnswers, draggingItem, ANDQty, oneQty, zeroQty]);

  // Handle Mode 1 interactions
  const handleGateClickMode1 = (gateId) => {
    if (isSuccess) return;
    if (gateId === 'G2') {
      playTutorialSound('correct');
      setIsSuccess(true);
      setSuccessMsg('BUG SPOTTED! You correctly spotted the malfunctioning AND gate (inputs were 1 and 1, but output was 0). (+1 Score)');
    } else {
      playTutorialSound('select');
    }
  };

  // Handle Mode 2 interactions
  const handleChoiceClickMode2 = (choice) => {
    if (isSuccess) return;
    if (choice === '0') {
      playTutorialSound('correct');
      setIsSuccess(true);
      setSuccessMsg('CORRECT OUTPUT! The XOR gate outputs 0. The AND gate takes 0 and 1, evaluating to 0. Masterful output calculation! (+1 Score)');
    } else {
      playTutorialSound('select');
    }
  };

  // Drag-and-drop mechanics for Mode 3
  const handleDragStart = (e, value, type) => {
    e.dataTransfer.setData('text/plain', value);
    e.dataTransfer.setData('itemType', type);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, cellId) => {
    e.preventDefault();
    const value = e.dataTransfer.getData('text/plain');
    const type = e.dataTransfer.getData('itemType');

    if (step === 1 && cellId === 'C2' && value === 'AND' && type === 'gate') {
      playTutorialSound('correct');
      setGridAnswers(prev => ({ ...prev, C2: 'AND' }));
      setANDQty(0);
      setStep(2);
      setDraggingItem(null);
    } else if (step === 3 && cellId === 'C4' && value === '1' && type === 'value') {
      playTutorialSound('correct');
      setGridAnswers(prev => ({ ...prev, C4: '1' }));
      setOneQty(0);
      setDraggingItem(null);
      setIsSuccess(true);
      setSuccessMsg('GRID SOLVED! Snap-fitting AND gate and value 1 satisfies the entire path logic (1 AND 1 = 1). Guide Session complete!');
    } else {
      playTutorialSound('select');
    }
  };

  const handleDoubleClickCell = (cellId) => {
    if (cellId === 'C4' && gridAnswers.C4 === '0' && step === 2) {
      playTutorialSound('correct');
      setGridAnswers(prev => ({ ...prev, C4: '' }));
      setZeroQty(1); // Return 0 to inventory
      setStep(3); // Proceed to step 3 (drag 1)
    } else if (cellId === 'C2' && gridAnswers.C2 === 'AND' && step === 2) {
      playTutorialSound('select');
      setGridAnswers(prev => ({ ...prev, C2: '' }));
      setANDQty(1);
      setStep(1);
    }
  };

  const handleNextMode = () => {
    if (mode < 3) {
      setMode(prev => prev + 1);
      setStep(1);
      setIsSuccess(false);
      setSuccessMsg('');
      setGridAnswers({ C2: '', C4: '0' });
      setANDQty(1);
      setOneQty(1);
      setZeroQty(0);
      setDraggingItem(null);
    } else {
      onCompleteMode?.();
    }
  };

  return (
    <div className="tutorial-overlay">

      <div className="glass-panel neo-border tutorial-card neo-shadow-lime" ref={containerRef} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Floating animated guidance pointer */}
        {pointerCoords && (
          <div
            className={`tutorial-pointer ${(pointerDirection === 'down' || pointerDirection === 'down2') ? 'bounce-down' : pointerDirection === 'up' ? 'bounce-up' : 'bounce-left'} ${mode === 2 ? 'secondary' : ''}`}
            style={{
              top: `${pointerCoords.top}px`,
              left: `${pointerCoords.left}px`,
              transform: pointerDirection === 'down' || pointerDirection === 'down2' || pointerDirection === 'up' ? 'translateX(-50%)' : 'none'
            }}
          >
            {pointerDirection === 'up' ? (
              <>
                <div className="tutorial-pointer-arrow" style={{ borderBottom: '12px solid var(--primary-lime)' }} />
                <div className="tutorial-pointer-label">
                  CLICK THE AND GATE
                </div>
              </>
            ) : pointerDirection === 'left' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div className="tutorial-pointer-label">
                  Select "0"
                </div>
                <div className="tutorial-pointer-arrow" />
              </div>
            ) : (
              <>
                <div className="tutorial-pointer-label">
                  {mode === 3 && step === 1
                    ? (draggingItem === 'AND' ? 'DROP HERE' : 'DRAG AND GATE')
                    : mode === 3 && step === 2
                      ? 'DOUBLE CLICK TO REMOVE'
                      : (draggingItem === '1' ? 'DROP HERE' : 'DRAG VALUE 1')}
                </div>
                <div className="tutorial-pointer-arrow" />
              </>
            )}
          </div>
        )}

        {/* Tutorial Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--surface-high)', paddingBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--primary-lime)', letterSpacing: '0.15em' }}>
              PROGRESS: {mode}/3
            </div>
            <h3 style={{ fontSize: '24px', margin: '4px 0 0 0', color: '#ffffff' }}>
              {mode === 1
                ? 'SPOT THE BUG'
                : mode === 2
                  ? 'BINARY BASH'
                  : 'CIRCUIT GRID'}
            </h3>
          </div>
          <button className="btn btn-ghost" style={{ padding: '8px 16px', fontSize: '12px' }} onClick={onClose}>
            Skip Guide
          </button>
        </div>

        {/* Dynamic Interactive Game Board */}
        <div className="glass-panel-lime" style={{ padding: '24px', backgroundColor: 'var(--surface-lowest)', minHeight: '260px', position: 'relative', maxWidth: '600px', width: '100%', margin: '0 auto' }}>
          {mode === 1 && (
            <CircuitRenderer
              circuit={mockMode1Circuit}
              mode={1}
              onGateClick={handleGateClickMode1}
            />
          )}

          {mode === 2 && (
            <CircuitRenderer
              circuit={mockMode2Circuit}
              mode={2}
              onGateClick={handleChoiceClickMode2}
            />
          )}

          {mode === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center' }}>

              {/* Responsive Crossword Grid */}
              <div
                className="neo-border"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '80px 40px 80px 40px 80px',
                  gridTemplateRows: '80px 40px 80px',
                  gap: '10px',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '24px',
                  backgroundColor: 'var(--surface-lowest)',
                  borderRadius: '1.5rem',
                  position: 'relative',
                  width: 'fit-content'
                }}
              >
                {/* Row 0 Col 0: Cell C1 (static 1) */}
                <div
                  className="crossword-cell static-value"
                  style={{
                    gridRow: 1,
                    gridColumn: 1,
                    border: '2px solid var(--primary-lime)',
                    backgroundColor: 'var(--surface-high)',
                    width: '80px',
                    height: '80px'
                  }}
                >
                  <span style={{ fontSize: '20px', fontWeight: '900' }}>1</span>
                </div>

                {/* Row 0 Col 1: Arrow right */}
                <div style={{ gridRow: 1, gridColumn: 2, display: 'flex', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined animate-pulse" style={{ color: 'var(--primary-lime)', fontSize: '24px' }}>arrow_forward</span>
                </div>

                {/* Row 0 Col 2: Cell C2 (empty gate cell, drop target) */}
                <div
                  id="tutorial-cell-C2"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, 'C2')}
                  onDoubleClick={() => handleDoubleClickCell('C2')}
                  className={`crossword-cell ${gridAnswers.C2 ? 'dropped-gate' : 'drop-target drop-target-gate'}`}
                  style={{
                    gridRow: 1,
                    gridColumn: 3,
                    border: '2px dashed var(--secondary-magenta)',
                    backgroundColor: gridAnswers.C2 ? 'var(--surface-high)' : 'rgba(254, 0, 254, 0.04)',
                    width: '80px',
                    height: '80px',
                    cursor: gridAnswers.C2 ? 'pointer' : 'default'
                  }}
                  title={gridAnswers.C2 ? "Double click to remove" : ""}
                >
                  {gridAnswers.C2 || ''}
                </div>

                {/* Row 0 Col 3: Arrow right */}
                <div style={{ gridRow: 1, gridColumn: 4, display: 'flex', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined animate-pulse" style={{ color: 'var(--primary-lime)', fontSize: '24px' }}>arrow_forward</span>
                </div>

                {/* Row 0 Col 4: Cell C3 (static 1) */}
                <div
                  className="crossword-cell static-value"
                  style={{
                    gridRow: 1,
                    gridColumn: 5,
                    border: '2px solid var(--primary-lime)',
                    backgroundColor: 'var(--surface-high)',
                    width: '80px',
                    height: '80px'
                  }}
                >
                  <span style={{ fontSize: '20px', fontWeight: '900' }}>1</span>
                </div>

                {/* Row 1 Col 2: Arrow upward (from C4 to C2) */}
                <div style={{ gridRow: 2, gridColumn: 3, display: 'flex', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined animate-pulse" style={{ color: 'var(--primary-lime)', fontSize: '24px' }}>arrow_upward</span>
                </div>

                {/* Row 2 Col 2: Cell C4 (value cell, drop target) */}
                <div
                  id="tutorial-cell-C4"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, 'C4')}
                  onDoubleClick={() => handleDoubleClickCell('C4')}
                  className={`crossword-cell ${gridAnswers.C4 ? 'dropped-value' : 'drop-target drop-target-value'}`}
                  style={{
                    gridRow: 3,
                    gridColumn: 3,
                    border: '2px dashed var(--primary-lime)',
                    backgroundColor: gridAnswers.C4 ? 'var(--surface-high)' : 'rgba(195, 244, 0, 0.04)',
                    width: '80px',
                    height: '80px',
                    cursor: gridAnswers.C4 ? 'pointer' : 'default'
                  }}
                  title={gridAnswers.C4 ? "Double click to remove" : ""}
                >
                  {gridAnswers.C4 || ''}
                </div>

              </div>

              {/* inventory */}
              <div
                className="crossword-inventory neo-border w-full"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  alignItems: 'center',
                  padding: '16px'
                }}
              >
                <div className="inventory-title">[ DRAGGABLE PROTOCOL COMPONENTS ]</div>
                <div style={{ display: 'flex', gap: '16px' }}>
                  {ANDQty > 0 && (
                    <div
                      id="tutorial-inv-AND"
                      draggable
                      onDragStart={(e) => {
                        handleDragStart(e, 'AND', 'gate');
                        setDraggingItem('AND');
                      }}
                      onDragEnd={() => setDraggingItem(null)}
                      className="draggable-gate"
                    >
                      AND ({ANDQty})
                    </div>
                  )}
                  {oneQty > 0 && (
                    <div
                      id="tutorial-inv-1"
                      draggable
                      onDragStart={(e) => {
                        handleDragStart(e, '1', 'value');
                        setDraggingItem('1');
                      }}
                      onDragEnd={() => setDraggingItem(null)}
                      className="draggable-value"
                    >
                      1 ({oneQty})
                    </div>
                  )}
                  {zeroQty > 0 && (
                    <div
                      id="tutorial-inv-0"
                      draggable
                      onDragStart={(e) => {
                        handleDragStart(e, '0', 'value');
                        setDraggingItem('0');
                      }}
                      onDragEnd={() => setDraggingItem(null)}
                      className="draggable-value"
                      style={{ borderColor: 'var(--primary-lime)' }}
                    >
                      0 ({zeroQty})
                    </div>
                  )}
                  {ANDQty === 0 && oneQty === 0 && zeroQty === 0 && (
                    <div style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '13px' }}>
                      Inventory complete
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Success Guidance & Actions overlay */}
        {isSuccess ? (
          <div
            className="neo-border"
            style={{
              backgroundColor: 'var(--success-bg)',
              border: '2px solid var(--primary-lime)',
              padding: '16px 20px',
              borderRadius: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              animation: 'pulse-neon-lime 2s infinite ease-in-out'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--primary-lime)' }}>check_circle</span>
              <div style={{ fontWeight: '800', color: 'var(--primary-lime)', fontSize: '13px', letterSpacing: '0.1em' }}>
                SOLVED SUCCESSFULLY
              </div>
            </div>
            <p style={{ color: '#ffffff', fontSize: '14px', lineHeight: '1.5', margin: 0 }}>
              {successMsg}
            </p>
            <button className="btn btn-primary" style={{ alignSelf: 'flex-end', padding: '10px 24px' }} onClick={handleNextMode}>
              {mode < 3 ? 'Proceed to next mode' : 'End Session'}
            </button>
          </div>
        ) : (
          <div
            className="neo-border"
            style={{
              backgroundColor: 'var(--surface-low)',
              padding: '16px 20px',
              borderRadius: '1.25rem'
            }}
          >
            <p style={{ color: 'var(--text-primary)', fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
              {mode === 1 && (
                <>
                  <strong>SPOT THE BUG</strong>: Trace the logical values. The input nodes deliver values of 1 and 0.
                  The XOR gate evaluates correctly, outputting 1. However, the AND gate (inputs 1 and 1) outputs 0, which is incorrect.
                  <em> Tap on the AND gate to report the bug.</em>
                </>
              )}
              {mode === 2 && (
                <>
                  <strong>BINARY BASH</strong>: Compute the final circuit output.
                  Inputs 1 and 1 output 0 from the XOR gate.
                  The AND gate takes 0 and 1, outputting 0.
                  <em> Select "0" as the target output choice on the right.</em>
                </>
              )}
              {mode === 3 && (
                <>
                  <strong>CIRCUIT GRID</strong>: Solve the interlocking grid.
                  The top logical path flows from 1 to 1. This requires an AND gate in the empty slot at the top.
                  However, the second input is pre-filled with 0, which makes the output incorrect.
                  {step === 1 && <em> Drag and drop the AND gate from your inventory to slot directed.</em>}
                  {step === 2 && <em> Double-click the cell containing 0 to clear it and return it to your inventory.</em>}
                  {step === 3 && <em> Drag and drop the value 1 from your inventory into the cleared cell to complete the path.</em>}
                </>
              )}
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
