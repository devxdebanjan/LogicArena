import React from 'react';
import CircuitRenderer from '../CircuitRenderer';
import CrosswordGrid from '../CrosswordGrid';

export default function MatchScreen({
  user,
  opponentName,
  opponentElo,
  isPracticeMode,
  isDailyChallengeMode,
  currentMode,
  myScore,
  mySolved,
  opponentScore,
  opponentSolved,
  timerDisplay,
  isTimerUrgent,
  flashStyle,
  answerFeedback,
  isSpamLocked,
  currentQuestion,
  puzzleData,
  userAnswers,
  setUserAnswers,
  submitGateAnswer,
  submitCrosswordAnswer,
  handleResign,
  showAlert
}) {
  return (
    <div style={{ width: '100%', maxWidth: '1100px', margin: '0 auto', position: 'relative' }}>

      {/* Match Header Dashboard */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'stretch', gap: '20px', marginBottom: '32px' }}>
        <div className="glass-panel neo-border" style={{
          flex: isPracticeMode || isDailyChallengeMode ? '0 1 340px' : '1',
          padding: '16px',
          borderLeft: '4px solid var(--primary-lime)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div>
              <div className="badge badge-lime" style={{ fontSize: '9px', marginBottom: '8px', alignSelf: 'flex-start' }}>You</div>
              <div style={{ fontWeight: '900', fontSize: '18px', color: '#ffffff', marginTop: '6px' }}>
                {user?.display_name || user?.username}
              </div>
            </div>
            {(currentMode === 1 || currentMode === 2) && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>SCORE</div>
                <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--primary-lime)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                  {myScore}
                </div>
              </div>
            )}
          </div>
        </div>

        {!(isPracticeMode || isDailyChallengeMode) && (
          <>
            <div style={{ flex: '1', display: 'flex' }}>
              <div
                className={`neo-border text-center ${isTimerUrgent ? 'pulse-neon-lime' : ''}`}
                style={{
                  backgroundColor: 'var(--surface-lowest)',
                  border: '2px solid var(--primary-lime)',
                  borderRadius: '2rem',
                  padding: '16px',
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center'
                }}
              >
                <div style={{ fontSize: '10px', fontWeight: '800', color: 'var(--primary-lime)', letterSpacing: '0.1em' }}>
                  DUEL CLOCK
                </div>
                <div style={{ fontSize: '36px', fontWeight: '900', color: isTimerUrgent ? 'var(--error)' : 'var(--primary-lime)', fontFamily: 'var(--font-mono)' }}>
                  {timerDisplay}s
                </div>
              </div>
            </div>

            <div className="glass-panel neo-border" style={{
              flex: '1',
              padding: '16px',
              borderRight: '4px solid var(--secondary-magenta)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                {!(isPracticeMode || isDailyChallengeMode) && (currentMode === 1 || currentMode === 2) && (
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>SCORE</div>
                    <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--secondary-magenta)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                      {opponentScore}
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textAlign: 'right' }}>
                  <div className="badge badge-magenta" style={{ fontSize: '9px', marginBottom: '8px', alignSelf: 'flex-end' }}>Opponent</div>
                  <div style={{ fontWeight: '900', fontSize: '18px', color: '#ffffff', marginTop: '6px' }}>
                    {opponentName}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {(isPracticeMode || isDailyChallengeMode) && (
          <div style={{ flex: '0 1 240px', display: 'flex' }}>
            <div
              className={`neo-border text-center ${isTimerUrgent ? 'pulse-neon-lime' : ''}`}
              style={{
                backgroundColor: 'var(--surface-lowest)',
                border: '2px solid var(--primary-lime)',
                borderRadius: '2rem',
                padding: '16px',
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}
            >
              <div style={{ fontSize: '10px', fontWeight: '800', color: 'var(--primary-lime)', letterSpacing: '0.1em' }}>
                {isPracticeMode ? 'SOLO PRACTICE CYCLE' : 'DAILY MISSION CYCLE'}
              </div>
              <div style={{ fontSize: '36px', fontWeight: '900', color: isTimerUrgent ? 'var(--error)' : 'var(--primary-lime)', fontFamily: 'var(--font-mono)' }}>
                {timerDisplay}s
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Rendering based on Mode */}
      <div className={`glass-panel neo-border ${flashStyle}`} style={{ padding: '24px', position: 'relative', marginBottom: '32px', minHeight: '300px' }}>
        {/* Visual Feedback Overlay */}
        {answerFeedback && (
          <div className={`feedback-overlay show ${answerFeedback}`} />
        )}
        {isSpamLocked ? (
          <div className="flex-center" style={{ flexDirection: 'column', height: '100%', minHeight: '250px', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '64px', color: 'var(--error)', marginBottom: '16px' }}>lock</span>
            <h2 style={{ color: 'var(--error)', fontSize: '24px', fontWeight: '900', letterSpacing: '0.05em', marginBottom: '8px' }}>
              SPAM DETECTED
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Match locked. Awaiting clock termination.
            </p>
          </div>
        ) : (
          <>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderBottom: '2px solid var(--surface-high)',
                paddingBottom: '12px',
                marginBottom: '20px'
              }}
            >
              <h3 style={{ fontSize: '18px', color: '#ffffff' }}>
                {currentMode === 1
                  ? 'Identify Malfunctioning Gate (Click)'
                  : currentMode === 2
                    ? 'Evaluate Target Binary Output'
                    : 'Solve Interlocking Logic Grid'}
              </h3>
              {currentMode === 3 && (
                <span className="badge badge-muted">CROSSWORD</span>
              )}
            </div>

            {currentMode === 3 ? (
              <CrosswordGrid
                puzzleData={puzzleData}
                userAnswers={userAnswers}
                setUserAnswers={setUserAnswers}
                showAlert={showAlert}
              />
            ) : (
              <CircuitRenderer
                circuit={currentQuestion?.circuit}
                mode={currentMode}
                onGateClick={submitGateAnswer}
              />
            )}
          </>
        )}
      </div>

      {currentMode === 3 && (
        <div style={{ marginTop: '24px' }}>
          <button className="btn btn-primary w-full" onClick={submitCrosswordAnswer}>
            Submit Crossword Solution
          </button>
        </div>
      )}

      {/* Abort button */}
      <div style={{ marginTop: '24px', textAlign: 'center' }}>
        <button className="btn btn-ghost" onClick={handleResign}>
          {isPracticeMode || isDailyChallengeMode ? 'Abort Mission' : 'Forfeit Duel'}
        </button>
      </div>
    </div>
  );
}
