import React from 'react';

export default function ResultsScreen({
  resultsData,
  user,
  opponentName,
  currentMode,
  isFriendMatch,
  resetToLobby
}) {
  return (
    <div className="flex-center" style={{ flex: 1 }}>
      <div className="glass-panel neo-border neo-shadow-lime" style={{ maxWidth: '600px', width: '100%', padding: '40px' }}>
        {resultsData.stats ? (
          /* Practice Mode Stats View */
          <>
            <svg width="120" height="120" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ margin: '0 auto 24px auto', display: 'block', filter: 'drop-shadow(0 0 12px rgba(195,244,0,0.4))' }}>
              <circle cx="50" cy="50" r="42" stroke="var(--primary-lime)" strokeWidth="2" strokeDasharray="4 4" />
              <path d="M50 20 V80 M20 50 H80 M35 35 L65 65 M35 65 L65 35" stroke="var(--primary-lime)" strokeWidth="2" />
              <circle cx="50" cy="50" r="12" fill="var(--bg)" stroke="var(--primary-lime)" strokeWidth="3" />
            </svg>
            <div
              style={{
                textAlign: 'center',
                fontSize: '36px',
                fontWeight: '900',
                color: 'var(--primary-lime)',
                borderBottom: '2px solid var(--surface-high)',
                paddingBottom: '20px',
                marginBottom: '32px'
              }}
            >
              PRACTICE COMPLETE
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div className="flex-center" style={{ justifyContent: 'space-between', padding: '14px', backgroundColor: 'var(--surface-low)' }}>
                <span style={{ fontWeight: '800' }}>Score</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '900', fontSize: '18px', color: 'var(--primary-lime)' }}>
                  {resultsData.stats.score}
                </span>
              </div>
              <div className="flex-center" style={{ justifyContent: 'space-between', padding: '14px', backgroundColor: 'var(--surface-lowest)' }}>
                <span style={{ fontWeight: '800' }}>Solved</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '900', fontSize: '18px', color: 'var(--primary-lime)' }}>
                  {resultsData.stats.questions_solved}
                </span>
              </div>
              <div className="flex-center" style={{ justifyContent: 'space-between', padding: '14px', backgroundColor: 'var(--surface-low)' }}>
                <span style={{ fontWeight: '800' }}>Attempted</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '900', fontSize: '18px' }}>
                  {resultsData.stats.questions_attempted}
                </span>
              </div>
              <div className="flex-center" style={{ justifyContent: 'space-between', padding: '14px', backgroundColor: 'var(--surface-lowest)' }}>
                <span style={{ fontWeight: '800' }}>Accuracy</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '900', fontSize: '18px' }}>
                  {resultsData.stats.solve_percentage}%
                </span>
              </div>
              <div className="flex-center" style={{ justifyContent: 'space-between', padding: '14px', backgroundColor: 'var(--surface-low)' }}>
                <span style={{ fontWeight: '800' }}>Average Solve Time</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '900', fontSize: '18px' }}>
                  {resultsData.stats.avg_solve_time_ms ? `${(resultsData.stats.avg_solve_time_ms / 1000).toFixed(1)}s` : '—'}
                </span>
              </div>
              <div className="flex-center" style={{ justifyContent: 'space-between', padding: '14px', backgroundColor: 'var(--surface-lowest)' }}>
                <span style={{ fontWeight: '800' }}>Fastest Solve</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '900', fontSize: '18px', color: 'var(--tertiary-cyan)' }}>
                  {resultsData.stats.fastest_solve_time_ms ? `${(resultsData.stats.fastest_solve_time_ms / 1000).toFixed(1)}s` : '—'}
                </span>
              </div>
            </div>
          </>
        ) : (
          /* Multiplayer / Duel Results View */
          <>
            {resultsData.is_draw ? (
              <svg width="120" height="120" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ margin: '0 auto 24px auto', display: 'block', filter: 'drop-shadow(0 0 12px rgba(0,251,251,0.4))' }}>
                <circle cx="50" cy="50" r="42" stroke="var(--tertiary-cyan)" strokeWidth="2" strokeDasharray="4 4" />
                <path d="M25 42 H75 M25 58 H75" stroke="var(--tertiary-cyan)" strokeWidth="3" strokeLinecap="round" />
                <circle cx="25" cy="42" r="3" fill="var(--tertiary-cyan)" />
                <circle cx="75" cy="42" r="3" fill="var(--tertiary-cyan)" />
                <circle cx="25" cy="58" r="3" fill="var(--tertiary-cyan)" />
                <circle cx="75" cy="58" r="3" fill="var(--tertiary-cyan)" />
              </svg>
            ) : resultsData.winner_id === user?.id ? (
              <svg width="120" height="120" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ margin: '0 auto 24px auto', display: 'block', filter: 'drop-shadow(0 0 12px rgba(195,244,0,0.4))' }}>
                <circle cx="50" cy="50" r="42" stroke="var(--primary-lime)" strokeWidth="2" strokeDasharray="4 4" />
                <path d="M32 30 H68 L60 62 L50 68 L40 62 Z" fill="none" stroke="var(--primary-lime)" strokeWidth="3" />
                <path d="M50 35 V55 M42 45 H58" stroke="var(--primary-lime)" strokeWidth="2" />
                <circle cx="50" cy="35" r="3" fill="var(--primary-lime)" />
                <circle cx="42" cy="45" r="3" fill="var(--primary-lime)" />
                <circle cx="58" cy="45" r="3" fill="var(--primary-lime)" />
                <circle cx="50" cy="55" r="3" fill="var(--primary-lime)" />
                <line x1="50" y1="2" x2="50" y2="8" stroke="var(--primary-lime)" strokeWidth="2" />
                <line x1="50" y1="98" x2="50" y2="92" stroke="var(--primary-lime)" strokeWidth="2" />
                <line x1="2" y1="50" x2="8" y2="50" stroke="var(--primary-lime)" strokeWidth="2" />
                <line x1="98" y1="50" x2="92" y2="50" stroke="var(--primary-lime)" strokeWidth="2" />
              </svg>
            ) : (
              <svg width="120" height="120" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ margin: '0 auto 24px auto', display: 'block', filter: 'drop-shadow(0 0 12px rgba(255,180,171,0.4))' }}>
                <circle cx="50" cy="50" r="42" stroke="var(--error)" strokeWidth="2" strokeDasharray="4 4" />
                <polygon points="50,15 85,35 85,75 50,95 15,75 15,35" fill="none" stroke="var(--error)" strokeWidth="3" />
                <path d="M35 35 L65 65 M65 35 L35 65" stroke="var(--error)" strokeWidth="3" strokeLinecap="round" />
                <circle cx="35" cy="35" r="3" fill="var(--error)" />
                <circle cx="65" cy="65" r="3" fill="var(--error)" />
                <circle cx="65" cy="35" r="3" fill="var(--error)" />
                <circle cx="35" cy="65" r="3" fill="var(--error)" />
              </svg>
            )}
            <div
              style={{
                textAlign: 'center',
                fontSize: '36px',
                fontWeight: '900',
                color: resultsData.is_draw
                  ? 'var(--tertiary-cyan)'
                  : resultsData.winner_id === user?.id
                    ? 'var(--primary-lime)'
                    : 'var(--error)',
                borderBottom: '2px solid var(--surface-high)',
                paddingBottom: '20px',
                marginBottom: '32px'
              }}
            >
              {resultsData.is_draw
                ? 'DRAW OUTCOME'
                : resultsData.winner_id === user?.id
                  ? 'VICTORY'
                  : 'DEFEAT'}
            </div>

            {currentMode === 3 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
                {/* You */}
                <div className="flex-center" style={{ justifyContent: 'space-between', padding: '14px', backgroundColor: 'var(--surface-low)' }}>
                  <div>
                    <span style={{ fontWeight: '800' }}>{user?.display_name || user?.username} (You)</span>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Elo: {isFriendMatch
                        ? 'Not Tracked'
                        : resultsData.player1?.user_id === user?.id
                          ? `${resultsData.player1.elo_before} → ${resultsData.player1.elo_after} (${resultsData.player1.elo_change >= 0 ? `+${resultsData.player1.elo_change}` : resultsData.player1.elo_change})`
                          : `${resultsData.player2?.user_id === user?.id
                            ? `${resultsData.player2.elo_before} → ${resultsData.player2.elo_after} (${resultsData.player2.elo_change >= 0 ? `+${resultsData.player2.elo_change}` : resultsData.player2.elo_change})`
                            : '—'
                          }`
                      }
                    </div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: '900', fontSize: '18px' }}>
                    {resultsData.player1?.user_id === user?.id
                      ? (resultsData.player1.solved ? `${(resultsData.player1.solve_time_ms / 1000).toFixed(1)}s` : 'Did Not Finish')
                      : (resultsData.player2?.solved ? `${(resultsData.player2.solve_time_ms / 1000).toFixed(1)}s` : 'Did Not Finish')
                    }
                  </div>
                </div>

                {/* Opponent */}
                <div className="flex-center" style={{ justifyContent: 'space-between', padding: '14px', backgroundColor: 'var(--surface-lowest)' }}>
                  <div>
                    <span style={{ fontWeight: '800' }}>{opponentName}</span>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Elo: {isFriendMatch
                        ? 'Not Tracked'
                        : resultsData.player1?.user_id !== user?.id
                          ? `${resultsData.player1.elo_before} → ${resultsData.player1.elo_after} (${resultsData.player1.elo_change >= 0 ? `+${resultsData.player1.elo_change}` : resultsData.player1.elo_change})`
                          : `${resultsData.player2?.user_id !== user?.id
                            ? `${resultsData.player2.elo_before} → ${resultsData.player2.elo_after} (${resultsData.player2.elo_change >= 0 ? `+${resultsData.player2.elo_change}` : resultsData.player2.elo_change})`
                            : '—'
                          }`
                      }
                    </div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: '900', fontSize: '18px' }}>
                    {resultsData.player1?.user_id !== user?.id
                      ? (resultsData.player1.solved ? `${(resultsData.player1.solve_time_ms / 1000).toFixed(1)}s` : 'Did Not Finish')
                      : (resultsData.player2?.solved ? `${(resultsData.player2.solve_time_ms / 1000).toFixed(1)}s` : 'Did Not Finish')
                    }
                  </div>
                </div>
              </div>
            ) : (
              /* Detailed side-by-side stats comparison for Mode 1 & 2 */
              <>
                {(() => {
                  const isP1Me = resultsData.player1?.user_id === user?.id;
                  const meData = isP1Me ? resultsData.player1 : resultsData.player2;
                  const oppData = isP1Me ? resultsData.player2 : resultsData.player1;
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '32px' }}>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid rgba(0, 251, 251, 0.15)', background: 'var(--surface-lowest)', fontSize: '14px' }}>
                          <thead>
                            <tr style={{ borderBottom: '2px solid rgba(0, 251, 251, 0.25)', backgroundColor: 'var(--surface-low)' }}>
                              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '800' }}>AREAS</th>
                              <th style={{ padding: '12px', textAlign: 'center', fontWeight: '800', color: 'var(--primary-lime)' }}>YOU</th>
                              <th style={{ padding: '12px', textAlign: 'center', fontWeight: '800', color: 'var(--secondary-magenta)' }}>{opponentName.toUpperCase()}</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                              <td style={{ padding: '12px', fontWeight: 'bold' }}>Score</td>
                              <td style={{ padding: '12px', textAlign: 'center', fontFamily: 'var(--font-mono)', color: 'var(--primary-lime)', fontWeight: '900', fontSize: '16px' }}>{meData?.score ?? 0}</td>
                              <td style={{ padding: '12px', textAlign: 'center', fontFamily: 'var(--font-mono)', color: 'var(--secondary-magenta)', fontWeight: '900', fontSize: '16px' }}>{oppData?.score ?? 0}</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', backgroundColor: 'var(--surface-low)' }}>
                              <td style={{ padding: '12px', fontWeight: 'bold' }}>Solved</td>
                              <td style={{ padding: '12px', textAlign: 'center', fontFamily: 'var(--font-mono)', color: 'var(--primary-lime)', fontWeight: '800' }}>{meData?.questions_solved ?? 0}</td>
                              <td style={{ padding: '12px', textAlign: 'center', fontFamily: 'var(--font-mono)', color: 'var(--secondary-magenta)', fontWeight: '800' }}>{oppData?.questions_solved ?? 0}</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                              <td style={{ padding: '12px', fontWeight: 'bold' }}>Attempted</td>
                              <td style={{ padding: '12px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{meData?.questions_attempted ?? 0}</td>
                              <td style={{ padding: '12px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{oppData?.questions_attempted ?? 0}</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', backgroundColor: 'var(--surface-low)' }}>
                              <td style={{ padding: '12px', fontWeight: 'bold' }}>Accuracy</td>
                              <td style={{ padding: '12px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                                {meData?.questions_attempted ? `${Math.round(((meData.questions_solved ?? 0) / meData.questions_attempted) * 100)}%` : '0%'}
                              </td>
                              <td style={{ padding: '12px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                                {oppData?.questions_attempted ? `${Math.round(((oppData.questions_solved ?? 0) / oppData.questions_attempted) * 100)}%` : '0%'}
                              </td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                              <td style={{ padding: '12px', fontWeight: 'bold' }}>Avg Solve Time</td>
                              <td style={{ padding: '12px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                                {meData?.avg_solve_time_ms ? `${(meData.avg_solve_time_ms / 1000).toFixed(1)}s` : '—'}
                              </td>
                              <td style={{ padding: '12px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                                {oppData?.avg_solve_time_ms ? `${(oppData.avg_solve_time_ms / 1000).toFixed(1)}s` : '—'}
                              </td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', backgroundColor: 'var(--surface-low)' }}>
                              <td style={{ padding: '12px', fontWeight: 'bold' }}>Fastest Solve</td>
                              <td style={{ padding: '12px', textAlign: 'center', fontFamily: 'var(--font-mono)', color: 'var(--tertiary-cyan)' }}>
                                {meData?.fastest_solve_time_ms ? `${(meData.fastest_solve_time_ms / 1000).toFixed(1)}s` : '—'}
                              </td>
                              <td style={{ padding: '12px', textAlign: 'center', fontFamily: 'var(--font-mono)', color: 'var(--tertiary-cyan)' }}>
                                {oppData?.fastest_solve_time_ms ? `${(oppData.fastest_solve_time_ms / 1000).toFixed(1)}s` : '—'}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* ELO Changes display */}
                      <div className="grid-container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div className="glass-panel neo-border" style={{ padding: '14px', borderLeft: '3px solid var(--primary-lime)' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>YOUR ELO UPDATE</span>
                          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: '900', fontSize: '15px', marginTop: '4px' }}>
                            {isFriendMatch ? 'Not Tracked' : meData ? `${meData.elo_before} → ${meData.elo_after} (${meData.elo_change >= 0 ? `+${meData.elo_change}` : meData.elo_change})` : '—'}
                          </div>
                        </div>
                        <div className="glass-panel neo-border" style={{ padding: '14px', borderLeft: '3px solid var(--secondary-magenta)' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>OPPONENT ELO UPDATE</span>
                          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: '900', fontSize: '15px', marginTop: '4px' }}>
                            {isFriendMatch ? 'Not Tracked' : oppData ? `${oppData.elo_before} → ${oppData.elo_after} (${oppData.elo_change >= 0 ? `+${oppData.elo_change}` : oppData.elo_change})` : '—'}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
          </>
        )}

        <button className="btn btn-primary w-full" onClick={resetToLobby}>
          Back to Lobby
        </button>
      </div>
    </div>
  );
}
