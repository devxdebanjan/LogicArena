import React, { useState } from 'react';

const MODE_INSTRUCTIONS = {
  1: {
    title: "SPOT THE BUG",
    description: "Inspect the logical circuit. Tap on the malfunctioning logic gate (the one producing the incorrect output value) to repair the system.",
    icon: "bug_report",
    color: "var(--error)"
  },
  2: {
    title: "BINARY BASH",
    description: "Trace the inputs through the logic circuit. Calculate and submit the final output value (0 or 1) as fast as possible to win.",
    icon: "code",
    color: "var(--secondary-magenta)"
  },
  3: {
    title: "CIRCUIT GRID",
    description: "Complete the interconnected circuit grid (crossword). Drag components from your inventory and drop them into the correct blank slots.",
    icon: "grid_view",
    color: "var(--tertiary-cyan)"
  }
};

export default function ArenaTab({
  currentMode,
  setCurrentMode,
  joinCodeInput,
  setJoinCodeInput,
  leaderboard,
  user,
  handleJoinFriendRoom,
  handleFindMatch,
  handleStartPractice,
  handleCreateFriendRoom,
  isActionThrottled
}) {
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState(null);
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  return (
    <div style={{ maxWidth: '1200px', width: '100%', margin: '0 auto' }}>

      {/* Friend Code Panel */}
      <div className="glass-panel neo-border mb-8" style={{ padding: '24px' }}>
        <div className="custom-room-header" style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div className="badge badge-cyan" style={{ padding: '10px 14px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>meeting_room</span>
            </div>
            <div>
              <h3 style={{ fontSize: '16px', margin: 0 }}>CUSTOM DUEL COMBAT ROOMS</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>ENTER DUEL COMBAT ROOM CODE</p>
            </div>
          </div>
          <form onSubmit={handleJoinFriendRoom} className="custom-room-form">
            <input
              type="text"
              className="input-field"
              placeholder="ENTER 6-KEY CODE..."
              value={joinCodeInput}
              onChange={(e) => setJoinCodeInput(e.target.value)}
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '10px 24px' }} disabled={isActionThrottled}>
              Join Room
            </button>
          </form>
        </div>
      </div>

      {/* Mode Select Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '32px', color: 'var(--primary-lime)' }}>LIVE DUEL COMBATS</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Select combat mode domain and enter a game</p>
        </div>
        {/* <div className="badge badge-cyan pulse-neon-lime">
          ACTIVE SECTORS SECURED
        </div> */}
      </div>

      {/* 3-Column Modes Select Grid */}
      <div className="tab-responsive-grid" style={{ marginBottom: '40px' }}>
        {/* Mode 1 */}
        <div
          onClick={() => setCurrentMode(1)}
          className={`glass-panel neo-border tab-col-4 ${currentMode === 1 ? 'neo-glow-lime' : ''}`}
          style={{
            padding: '30px',
            cursor: 'pointer',
            border: currentMode === 1 ? '2px solid var(--primary-lime)' : '2px solid rgba(255,255,255,0.08)',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
            <span className="material-symbols-outlined text-3xl" style={{ color: 'var(--error)' }}>bug_report</span>
            <span className="badge badge-lime">GLITCH MATRIX</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <h3 style={{ fontSize: '20px', margin: 0 }}>SPOT THE BUG</h3>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '20px', color: 'var(--tertiary-cyan)', cursor: 'pointer', userSelect: 'none' }}
              onClick={(e) => { e.stopPropagation(); setShowInstructionsModal(1); }}
            >
              help
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '32px' }}>
            Locate malfunctioning gate errors within complex logical topologies.
          </p>
          <div className="mode-card-actions">
            <button className="btn btn-primary" style={{ flex: 1, padding: '10px' }} disabled={isActionThrottled} onClick={(e) => { e.stopPropagation(); handleFindMatch(1); }}>
              Find Match
            </button>
            <button className="btn btn-ghost" style={{ flex: 1, padding: '10px' }} onClick={(e) => { e.stopPropagation(); handleStartPractice(1); }}>
              Solo
            </button>
          </div>
        </div>

        {/* Mode 2 */}
        <div
          onClick={() => setCurrentMode(2)}
          className={`glass-panel neo-border tab-col-4 ${currentMode === 2 ? 'neo-glow-magenta' : ''}`}
          style={{
            padding: '30px',
            cursor: 'pointer',
            border: currentMode === 2 ? '2px solid var(--secondary-magenta)' : '2px solid rgba(255,255,255,0.08)',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
            <span className="material-symbols-outlined text-3xl" style={{ color: 'var(--secondary-magenta)' }}>code</span>
            <span className="badge badge-magenta">ZERO TO ONE</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <h3 style={{ fontSize: '20px', margin: 0 }}>BINARY BASH</h3>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '20px', color: 'var(--tertiary-cyan)', cursor: 'pointer', userSelect: 'none' }}
              onClick={(e) => { e.stopPropagation(); setShowInstructionsModal(2); }}
            >
              help
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '32px' }}>
            Evaluate circuits to deduce final output. Speed rules this sector.
          </p>
          <div className="mode-card-actions">
            <button className="btn btn-secondary" style={{ flex: 1, padding: '10px' }} disabled={isActionThrottled} onClick={(e) => { e.stopPropagation(); handleFindMatch(2); }}>
              Find Match
            </button>
            <button className="btn btn-ghost" style={{ flex: 1, padding: '10px' }} onClick={(e) => { e.stopPropagation(); handleStartPractice(2); }}>
              Solo
            </button>
          </div>
        </div>

        {/* Mode 3 */}
        <div
          onClick={() => setCurrentMode(3)}
          className={`glass-panel neo-border tab-col-4 ${currentMode === 3 ? 'neo-glow-cyan' : ''}`}
          style={{
            padding: '30px',
            cursor: 'pointer',
            border: currentMode === 3 ? '2px solid var(--tertiary-cyan)' : '2px solid rgba(255,255,255,0.08)',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
            <span className="material-symbols-outlined text-3xl" style={{ color: 'var(--tertiary-cyan)' }}>grid_view</span>
            <span className="badge badge-cyan">CROSS CIRCUIT</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <h3 style={{ fontSize: '20px', margin: 0 }}>CIRCUIT GRID</h3>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '20px', color: 'var(--tertiary-cyan)', cursor: 'pointer', userSelect: 'none' }}
              onClick={(e) => { e.stopPropagation(); setShowInstructionsModal(3); }}
            >
              help
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '32px' }}>
            Resolve interconnecting crossword gate slots. Structural puzzles.
          </p>
          <div className="mode-card-actions">
            <button className="btn btn-tertiary" style={{ flex: 1, padding: '10px' }} disabled={isActionThrottled} onClick={(e) => { e.stopPropagation(); handleFindMatch(3); }}>
              Find Match
            </button>
            <button className="btn btn-ghost" style={{ flex: 1, padding: '10px' }} onClick={(e) => { e.stopPropagation(); handleStartPractice(3); }}>
              Solo
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '40px' }}>
        <button className="btn btn-ghost" disabled={isActionThrottled} onClick={() => setShowCreateRoomModal(true)}>
          <span className="material-symbols-outlined">group</span> Create Duel Room Code
        </button>
      </div>

      {/* Global Leaderboard Panel */}
      <div className="glass-panel neo-border" style={{ padding: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '20px', margin: 0 }}>GLOBAL PLAYER RANKINGS</h3>
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: '20px',
              color: 'var(--tertiary-cyan)',
              cursor: 'pointer',
              userSelect: 'none'
            }}
            onClick={() => setShowHelpModal(true)}
          >
            help
          </span>
        </div>
        <div className="table-container">
          <table className="neo-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Operator</th>
                <th>Elo Rating</th>
                <th>Win Ratio</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((item, idx) => {
                const isMe = item.username === user?.username;
                return (
                  <tr key={item.id} className="table-row" style={{ borderLeft: isMe ? '4px solid var(--primary-lime)' : 'none' }}>
                    <td>{idx + 1}</td>
                    <td style={{ fontWeight: '800', color: isMe ? 'var(--primary-lime)' : '#ffffff' }}>
                      {item.display_name || item.username} {isMe && '(You)'}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{item.elo} ELO</td>
                    <td>
                      {item.games_played > 0
                        ? `${Math.round((item.games_won / item.games_played) * 100)}%`
                        : '0%'
                      }
                    </td>
                  </tr>
                );
              })}
              {leaderboard.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    Scanning through players...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showHelpModal && (
        <div
          className="flex-center"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(5px)',
            zIndex: 9999,
          }}
          onClick={() => setShowHelpModal(false)}
        >
          <div
            className="glass-panel neo-border neo-shadow-cyan"
            style={{
              maxWidth: '450px',
              width: '90%',
              padding: '30px',
              textAlign: 'center',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <span className="material-symbols-outlined text-4xl" style={{ color: 'var(--tertiary-cyan)' }}>
                info
              </span>
            </div>
            <h3 style={{ fontSize: '20px', color: '#ffffff', marginBottom: '12px' }}>
              Rankings Protocol
            </h3>
            <p style={{ color: 'var(--text-primary)', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
              Players must complete at least 5 matches to be eligible for ratings and qualify for placement on the Global Player Rankings leaderboard.
            </p>
            <button
              className="btn btn-primary w-full"
              onClick={() => setShowHelpModal(false)}
            >
              Makes Sense!
            </button>
          </div>
        </div>
      )}

      {showInstructionsModal !== null && (
        <div
          className="flex-center"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(5px)',
            zIndex: 9999,
          }}
          onClick={() => setShowInstructionsModal(null)}
        >
          <div
            className="glass-panel neo-border"
            style={{
              maxWidth: '450px',
              width: '90%',
              padding: '30px',
              textAlign: 'center',
              position: 'relative',
              borderColor: MODE_INSTRUCTIONS[showInstructionsModal].color,
              boxShadow: `0 0 20px ${MODE_INSTRUCTIONS[showInstructionsModal].color}33`
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <span
                className="material-symbols-outlined text-4xl"
                style={{ color: MODE_INSTRUCTIONS[showInstructionsModal].color }}
              >
                {MODE_INSTRUCTIONS[showInstructionsModal].icon}
              </span>
            </div>
            <h3 style={{ fontSize: '20px', color: '#ffffff', marginBottom: '12px' }}>
              {MODE_INSTRUCTIONS[showInstructionsModal].title}
            </h3>
            <p style={{ color: 'var(--text-primary)', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
              {MODE_INSTRUCTIONS[showInstructionsModal].description}
            </p>
            <button
              className="btn btn-primary w-full"
              style={{
                backgroundColor: MODE_INSTRUCTIONS[showInstructionsModal].color,
                color: '#000000',
                border: 'none',
                boxShadow: `0 0 10px ${MODE_INSTRUCTIONS[showInstructionsModal].color}33`
              }}
              onClick={() => setShowInstructionsModal(null)}
            >
              Understood!
            </button>
          </div>
        </div>
      )}

      {showCreateRoomModal && (
        <div
          className="flex-center"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(5px)',
            zIndex: 9999,
          }}
          onClick={() => setShowCreateRoomModal(false)}
        >
          <div
            className="glass-panel neo-border neo-shadow-magenta"
            style={{
              maxWidth: '500px',
              width: '90%',
              padding: '30px',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '20px', color: '#ffffff', margin: 0 }}>
                INITIATE CUSTOM COMBAT
              </h3>
              <span
                className="material-symbols-outlined"
                style={{ cursor: 'pointer', color: 'var(--text-muted)' }}
                onClick={() => setShowCreateRoomModal(false)}
              >
                close
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
              Select the game mode for your custom room. Players joining your code will automatically match this mode.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
              <div
                className="glass-panel neo-border"
                style={{
                  padding: '16px 20px',
                  cursor: 'pointer',
                  border: '1.5px solid rgba(255,255,255,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--error)'; e.currentTarget.style.boxShadow = '0 0 12px rgba(255, 180, 171, 0.25)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'none'; }}
                onClick={() => {
                  setShowCreateRoomModal(false);
                  handleCreateFriendRoom(1);
                }}
              >
                <span className="material-symbols-outlined text-2xl" style={{ color: 'var(--error)' }}>bug_report</span>
                <div>
                  <h4 style={{ margin: 0, fontSize: '15px', color: '#ffffff' }}>SPOT THE BUG</h4>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>Glitch matrix: Identify the faulty logic gate</p>
                </div>
              </div>

              <div
                className="glass-panel neo-border"
                style={{
                  padding: '16px 20px',
                  cursor: 'pointer',
                  border: '1.5px solid rgba(255,255,255,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--secondary-magenta)'; e.currentTarget.style.boxShadow = '0 0 12px rgba(254, 0, 254, 0.25)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'none'; }}
                onClick={() => {
                  setShowCreateRoomModal(false);
                  handleCreateFriendRoom(2);
                }}
              >
                <span className="material-symbols-outlined text-2xl" style={{ color: 'var(--secondary-magenta)' }}>code</span>
                <div>
                  <h4 style={{ margin: 0, fontSize: '15px', color: '#ffffff' }}>BINARY BASH</h4>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>Zero to One: Rapid evaluation of logical circuits</p>
                </div>
              </div>

              <div
                className="glass-panel neo-border"
                style={{
                  padding: '16px 20px',
                  cursor: 'pointer',
                  border: '1.5px solid rgba(255,255,255,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--tertiary-cyan)'; e.currentTarget.style.boxShadow = '0 0 12px rgba(0, 251, 251, 0.25)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'none'; }}
                onClick={() => {
                  setShowCreateRoomModal(false);
                  handleCreateFriendRoom(3);
                }}
              >
                <span className="material-symbols-outlined text-2xl" style={{ color: 'var(--tertiary-cyan)' }}>grid_view</span>
                <div>
                  <h4 style={{ margin: 0, fontSize: '15px', color: '#ffffff' }}>CIRCUIT GRID</h4>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>Cross Circuit: Resolve interlocking circuit crosswords</p>
                </div>
              </div>
            </div>

            <button
              className="btn btn-ghost w-full"
              onClick={() => setShowCreateRoomModal(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
