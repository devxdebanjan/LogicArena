import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import LoadingScreen from './components/LoadingScreen';

import { useAuth } from './hooks/useAuth';
import { useArenaGame } from './hooks/useArenaGame';

import LoginScreen from './components/screens/LoginScreen';
import QueueScreen from './components/screens/QueueScreen';
import FriendWaitScreen from './components/screens/FriendWaitScreen';
import CountdownScreen from './components/screens/CountdownScreen';
import MatchScreen from './components/screens/MatchScreen';
import ResultsScreen from './components/screens/ResultsScreen';

import ArenaTab from './components/tabs/ArenaTab';
import DailyTab from './components/tabs/DailyTab';
import GuideTab from './components/tabs/GuideTab';
import ProfileTab from './components/tabs/ProfileTab';

import { leaderboardService, dailyService } from './api';

export default function App() {
  const [activeTab, setActiveTab] = useState('arena');
  const [leaderboard, setLeaderboard] = useState([]);
  const [dailyLeaderboard, setDailyLeaderboard] = useState([]);

  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    type: 'alert', // 'alert' | 'confirm'
    title: 'ALERT',
    message: '',
    onConfirm: null,
    onCancel: null
  });

  const showAlert = (message, title = 'SYSTEM NOTIFICATION') => {
    setModalConfig({
      isOpen: true,
      type: 'alert',
      title,
      message,
      onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
    });
  };

  const showConfirm = (message, onConfirm, onCancel = null, title = 'SYSTEM CONFIRMATION') => {
    setModalConfig({
      isOpen: true,
      type: 'confirm',
      title,
      message,
      onConfirm: () => {
        setModalConfig(prev => ({ ...prev, isOpen: false }));
        if (onConfirm) onConfirm();
      },
      onCancel: () => {
        setModalConfig(prev => ({ ...prev, isOpen: false }));
        if (onCancel) onCancel();
      }
    });
  };

  const loadGlobalLeaderboard = async () => {
    try {
      const data = await leaderboardService.getGlobalLeaderboard();
      setLeaderboard(data);
    } catch (e) {
      console.error('Failed to load global leaderboard:', e);
    }
  };

  const loadDailyLeaderboard = async () => {
    try {
      const rankings = await dailyService.getDailyLeaderboard();
      setDailyLeaderboard(rankings);
    } catch (e) {
      console.error('Failed to fetch daily rankings:', e);
    }
  };

  const auth = useAuth(loadGlobalLeaderboard, showAlert);

  const game = useArenaGame({
    user: auth.user,
    setUser: auth.setUser,
    setIsLoading: auth.setIsLoading,
    setLoadingMsg: auth.setLoadingMsg,
    loadGlobalLeaderboard,
    loadDailyLeaderboard,
    showAlert,
    showConfirm
  });

  // Sync Daily information on Tab change or login
  useEffect(() => {
    if (auth.isAuthenticated && activeTab === 'daily') {
      loadDailyLeaderboard();
    }
  }, [auth.isAuthenticated, activeTab]);

  if (auth.isLoading) {
    return <LoadingScreen message={auth.loadingMsg} />;
  }

  if (!auth.isAuthenticated) {
    return (
      <LoginScreen
        handleGuestLogin={auth.handleGuestLogin}
        handleGoogleAuthSuccess={auth.handleGoogleAuthSuccess}
        showAlert={showAlert}
      />
    );
  }

  return (
    <div className="app-container">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          game.resetToLobby();
        }}
        user={auth.user}
        onLogout={() => auth.handleLogout(game.resetToLobby)}
        showAlert={showAlert}
      />

      <main className="main-content">
        {/* Active Screen Overrides */}

        {game.gameScreen === 'queue' && (
          <QueueScreen
            queueElapsed={game.queueElapsed}
            handleLeaveQueue={game.handleLeaveQueue}
          />
        )}

        {game.gameScreen === 'friend_wait' && (
          <FriendWaitScreen
            friendRoomCode={game.friendRoomCode}
            handleCancelFriendRoom={game.handleCancelFriendRoom}
          />
        )}

        {game.gameScreen === 'countdown' && (
          <CountdownScreen
            user={auth.user}
            opponentName={game.opponentName}
            countdownNum={game.countdownNum}
          />
        )}

        {game.gameScreen === 'match' && (
          <MatchScreen
            user={auth.user}
            opponentName={game.opponentName}
            opponentElo={game.opponentElo}
            isPracticeMode={game.isPracticeMode}
            isDailyChallengeMode={game.isDailyChallengeMode}
            currentMode={game.currentMode}
            myScore={game.myScore}
            mySolved={game.mySolved}
            opponentScore={game.opponentScore}
            opponentSolved={game.opponentSolved}
            timerDisplay={game.timerDisplay}
            isTimerUrgent={game.isTimerUrgent}
            flashStyle={game.flashStyle}
            answerFeedback={game.answerFeedback}
            isSpamLocked={game.isSpamLocked}
            currentQuestion={game.currentQuestion}
            puzzleData={game.puzzleData}
            userAnswers={game.userAnswers}
            setUserAnswers={game.setUserAnswers}
            submitGateAnswer={game.submitGateAnswer}
            submitCrosswordAnswer={game.submitCrosswordAnswer}
            handleResign={game.handleResign}
            showAlert={showAlert}
          />
        )}

        {game.gameScreen === 'results' && game.resultsData && (
          <ResultsScreen
            resultsData={game.resultsData}
            user={auth.user}
            opponentName={game.opponentName}
            currentMode={game.currentMode}
            resetToLobby={game.resetToLobby}
          />
        )}

        {game.gameScreen === 'lobby' && (
          <>
            {activeTab === 'arena' && (
              <ArenaTab
                currentMode={game.currentMode}
                setCurrentMode={game.setCurrentMode}
                joinCodeInput={game.joinCodeInput}
                setJoinCodeInput={game.setJoinCodeInput}
                leaderboard={leaderboard}
                user={auth.user}
                handleJoinFriendRoom={game.handleJoinFriendRoom}
                handleFindMatch={game.handleFindMatch}
                handleStartPractice={game.handleStartPractice}
                handleCreateFriendRoom={game.handleCreateFriendRoom}
                isActionThrottled={game.isActionThrottled}
              />
            )}

            {activeTab === 'daily' && (
              <DailyTab
                user={auth.user}
                dailyLeaderboard={dailyLeaderboard}
                handleStartDailyChallenge={game.handleStartDailyChallenge}
              />
            )}

            {activeTab === 'guide' && (
              <GuideTab />
            )}

            {activeTab === 'profile' && (
              <ProfileTab
                user={auth.user}
                displayNameInput={auth.displayNameInput}
                setDisplayNameInput={auth.setDisplayNameInput}
                handleUpdateProfile={auth.handleUpdateProfile}
                handleGoogleAuthSuccess={auth.handleGoogleAuthSuccess}
              />
            )}
          </>
        )}
      </main>

      {/* Custom React Alerts / Confirms */}
      {modalConfig.isOpen && (
        <div
          className="flex-center"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(6px)',
            zIndex: 10000,
          }}
          onClick={() => {
            if (modalConfig.type === 'alert') {
              modalConfig.onConfirm?.();
            }
          }}
        >
          <div
            className={`glass-panel neo-border ${modalConfig.type === 'confirm' ? 'neo-shadow-magenta' : 'neo-shadow-lime'}`}
            style={{
              maxWidth: '480px',
              width: '90%',
              padding: '36px',
              textAlign: 'center',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <span
                className="material-symbols-outlined text-5xl"
                style={{ color: modalConfig.type === 'confirm' ? 'var(--secondary-magenta)' : 'var(--primary-lime)' }}
              >
                {modalConfig.type === 'confirm' ? 'report_problem' : 'terminal'}
              </span>
            </div>

            <h3 style={{
              fontSize: '22px',
              color: '#ffffff',
              marginBottom: '16px',
              letterSpacing: '0.05em'
            }}>
              {modalConfig.title}
            </h3>

            <p style={{
              color: 'var(--text-primary)',
              fontSize: '14px',
              lineHeight: '1.6',
              marginBottom: '32px'
            }}>
              {modalConfig.message}
            </p>

            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
              {modalConfig.type === 'confirm' && (
                <button
                  className="btn btn-ghost"
                  style={{ flex: 1 }}
                  onClick={modalConfig.onCancel}
                >
                  Resume
                </button>
              )}
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={modalConfig.onConfirm}
              >
                {modalConfig.type === 'confirm' ? 'Confirm' : 'Acknowledge'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
