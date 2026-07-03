import React from 'react';

export default function DailyTab({
  user,
  dailyLeaderboard,
  handleStartDailyChallenge
}) {
  return (
    <div style={{ maxWidth: '1000px', width: '100%', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
        <div>
          <h2 style={{ fontSize: '32px', color: 'var(--secondary-magenta)' }}>DAILY MISSION</h2>
          <p style={{ color: 'var(--text-muted)' }}>Extend streak ratings by completing daily challenge</p>
        </div>
      </div>

      <div className="tab-responsive-grid" style={{ marginBottom: '40px' }}>

        {/* Daily Quest card */}
        <div className="glass-panel neo-border tab-col-12" style={{ padding: '30px', borderLeft: '4px solid var(--primary-lime)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '22px' }}>TODAY'S CIRCUIT GRID</h3>
            <div className="badge badge-lime hidden-mobile">STREAK: {user?.current_streak || 0}</div>
          </div>
          {/* <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '14px', lineHeight: '1.6' }}>
            Today's challenge is a Circuit Grid crossword logic puzzle. Solve coordinates to extend daily records. Perfect efficiency awards ELO score multipliers.
          </p> */}

          <button className="btn btn-primary w-full" onClick={handleStartDailyChallenge}>
            Attempt Daily Challenge
          </button>
        </div>

        {/* Daily Streak Info card */}
        <div className="glass-panel neo-border tab-col-12" style={{ padding: '30px', borderLeft: '4px solid var(--tertiary-cyan)' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '20px' }}>Streak Records</h3>
          <div className="daily-streak-layout">
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>CURRENT STREAK</div>
              <div style={{ fontSize: '28px', fontWeight: '900', color: 'var(--primary-lime)' }}>
                {user?.current_streak || 0} Days
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>PERSONAL BEST STREAK</div>
              <div style={{ fontSize: '28px', fontWeight: '900', color: 'var(--tertiary-cyan)' }}>
                {user?.best_streak || 0} Days
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Leaderboard */}
      <div className="glass-panel neo-border" style={{ padding: '30px' }}>
        <h3 className="mb-6" style={{ fontSize: '20px' }}>TODAY'S MISSION SPEED RANKINGS</h3>
        <div className="table-container">
          <table className="neo-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Operator</th>
                <th>Solve Duration</th>
              </tr>
            </thead>
            <tbody>
              {dailyLeaderboard.map((item, idx) => {
                const isMe = item.username === user?.username;
                return (
                  <tr key={idx} className="table-row">
                    <td>{idx + 1}</td>
                    <td style={{ fontWeight: '800', color: isMe ? 'var(--primary-lime)' : '#ffffff' }}>
                      {item.display_name || item.username} {isMe && '(You)'}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{(item.solve_time_ms / 1000).toFixed(1)}s</td>
                  </tr>
                );
              })}
              {dailyLeaderboard.length === 0 && (
                <tr>
                  <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No solves recorded today. Solve now to claim first rank!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
