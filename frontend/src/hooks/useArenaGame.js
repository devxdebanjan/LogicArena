import { useState, useEffect, useRef } from 'react';
import { playSynthSound } from '../utils/audio';
import {
  evaluateMode1BuggyGate,
  evaluateMode2Circuit,
  evaluateMode3Crossword
} from '../utils/logicEvaluator';
import {
  WS_BASE,
  accessToken,
  dailyService,
  practiceService,
  authService
} from '../api';

export function useArenaGame({
  user,
  setUser,
  setIsLoading,
  setLoadingMsg,
  loadGlobalLeaderboard,
  loadDailyLeaderboard,
  showAlert,
  showConfirm
}) {
  const [currentMode, setCurrentMode] = useState(2); // 1 | 2 | 3
  const activeModeRef = useRef(2);

  useEffect(() => {
    activeModeRef.current = currentMode;
  }, [currentMode]);

  const [gameScreen, setGameScreen] = useState('lobby'); // lobby | queue | friend_wait | countdown | match | results
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [isDailyChallengeMode, setIsDailyChallengeMode] = useState(false);
  const [isSpamLocked, setIsSpamLocked] = useState(false);
  const [isActionThrottled, setIsActionThrottled] = useState(false);

  const throttleAction = () => {
    setIsActionThrottled(true);
    setTimeout(() => setIsActionThrottled(false), 2000);
  };

  // Match info
  const [opponentName, setOpponentName] = useState('Opponent');
  const [opponentElo, setOpponentElo] = useState(1000);
  const [isBotMatch, setIsBotMatch] = useState(false);
  const [isFriendMatch, setIsFriendMatch] = useState(false);
  const [countdownNum, setCountdownNum] = useState(3);

  const [myScore, setMyScore] = useState(0);
  const [mySolved, setMySolved] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [opponentSolved, setOpponentSolved] = useState(0);

  // Timer displays
  const [timerDisplay, setTimerDisplay] = useState('0.0');
  const [isTimerUrgent, setIsTimerUrgent] = useState(false);

  // Puzzle structures
  const [currentQuestion, setCurrentQuestion] = useState(null); // Mode 1/2
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentPuzzleId, setCurrentPuzzleId] = useState(null); // Mode 3 / Daily
  const [puzzleData, setPuzzleData] = useState(null); // Mode 3 structure
  const [userAnswers, setUserAnswers] = useState({}); // Mode 3 placement map

  // Inputs
  const [binaryAnswerInput, setBinaryAnswerInput] = useState('');

  // Feedbacks
  const [answerFeedback, setAnswerFeedback] = useState(null); // 'correct' | 'wrong' | null
  const [flashStyle, setFlashStyle] = useState(''); // flash-correct | flash-wrong | ''

  // Friend match codes
  const [friendRoomCode, setFriendRoomCode] = useState(null);
  const [joinCodeInput, setJoinCodeInput] = useState('');

  // Results Overview
  const [resultsData, setResultsData] = useState(null);

  // WebSocket and Timer References
  const wsRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const queueIntervalRef = useRef(null);
  const timerStartRef = useRef(null);
  const timerEndRef = useRef(null);
  const queueStartRef = useRef(null);
  const [queueElapsed, setQueueElapsed] = useState(0);

  // Refs to prevent stale closures in callbacks
  const updateCountdownTimerRef = useRef(null);
  const handleWSMessageRef = useRef(null);

  // Local Practice Mode States and Refs
  const [practiceQuestions, setPracticeQuestions] = useState([]);
  const questionStartRef = useRef(null);
  const solveTimesRef = useRef([]);
  const lastTickSecondRef = useRef(-1);

  // Sync latest versions of callbacks to refs to avoid stale closures in loops
  useEffect(() => {
    updateCountdownTimerRef.current = updateCountdownTimer;
    handleWSMessageRef.current = handleWSMessage;
  });

  const triggerFlash = (correct) => {
    playSynthSound(correct ? 'correct' : 'wrong');
    setAnswerFeedback(correct ? 'correct' : 'wrong');
    setFlashStyle(correct ? 'flash-correct' : 'flash-wrong');
    setTimeout(() => {
      setAnswerFeedback(null);
      setFlashStyle('');
    }, 500);
  };

  const connectWS = (mode, isPractice, onOpenCallback = null) => {
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (err) {
        console.error('Error closing old socket:', err);
      }
      wsRef.current = null;
    }

    setIsPracticeMode(isPractice);

    const url = isPractice
      ? `${WS_BASE}/ws/practice?mode=${mode}&token=${accessToken}`
      : `${WS_BASE}/ws/arena?mode=${mode}&token=${accessToken}`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (isPractice) {
        setIsLoading(false);
        ws.send(JSON.stringify({ type: 'start_match' }));
      } else if (onOpenCallback) {
        onOpenCallback(ws);
      }
    };

    ws.onclose = (e) => {
      console.log(`WebSocket closed: ${e.code} ${e.reason}`);
      if (wsRef.current === ws) {
        wsRef.current = null;
        setIsLoading(false);
      }
    };

    ws.onmessage = (event) => {
      if (wsRef.current !== ws) return;
      const data = JSON.parse(event.data);
      if (handleWSMessageRef.current) {
        handleWSMessageRef.current(data);
      }
    };

    ws.onerror = (err) => {
      console.error('Socket error:', err);
      if (wsRef.current === ws) {
        setIsLoading(false);
        if (showAlert) {
          showAlert('Refresh and Try Again', 'CONNECTION FAILURE');
        } else {
          alert('Connection Failure: Refresh and Try Again');
        }
      }
    };
  };

  const handleWSMessage = (data) => {
    switch (data.type) {
      case 'queue_joined':
        setGameScreen('queue');
        startQueueTimer();
        setIsLoading(false);
        break;

      case 'queue_left':
        stopQueueTimer();
        setGameScreen('lobby');
        setIsLoading(false);
        break;

      case 'friend_room_created':
        setFriendRoomCode(data.room_code);
        setGameScreen('friend_wait');
        setIsLoading(false);
        break;

      case 'friend_room_cancelled':
        setFriendRoomCode(null);
        setGameScreen('lobby');
        setIsLoading(false);
        break;

      case 'match_found':
        stopQueueTimer();
        setOpponentName(data.opponent_name || 'Opponent');
        setOpponentElo(data.opponent_elo || 1000);
        setIsBotMatch(!!data.is_bot_match);
        setIsFriendMatch(!!data.is_friend_match);
        if (data.mode) {
          setCurrentMode(data.mode);
          activeModeRef.current = data.mode;
        }
        setIsLoading(false);
        setGameScreen('countdown');
        break;

      case 'countdown':
        setCountdownNum(data.seconds_remaining);
        if (data.seconds_remaining >= 1 && data.seconds_remaining <= 3) {
          playSynthSound('tick');
        }
        break;

      case 'match_started':
        playSynthSound('start');
        setIsLoading(false);
        setMyScore(0);
        setMySolved(0);
        setOpponentScore(0);
        setOpponentSolved(0);
        setGameScreen('match');
        setIsSpamLocked(false);

        if (activeModeRef.current === 3) {
          setPuzzleData(data.puzzle.data);
          setCurrentPuzzleId(data.puzzle.id);
          setUserAnswers({});
          startStopwatch();
        } else {
          const qs = data.questions || (data.question ? [data.question] : []);
          setPracticeQuestions(qs);
          setCurrentQuestion(qs[0] || null);
          setCurrentQuestionIndex(0);
          setBinaryAnswerInput('');
          startCountdown(data.duration_seconds || 60);
          questionStartRef.current = Date.now();
        }
        break;

      case 'match_loading':
        setIsLoading(true);
        setLoadingMsg('LOADING PRACTICE CIRCUITS...');
        break;

      case 'answer_result':
        setIsLoading(false);
        if (activeModeRef.current === 3) {
          triggerFlash(data.correct);
          setMyScore(data.score);
          if (data.correct) setMySolved(s => s + 1);
        } else {
          setMyScore(data.score);
        }
        setOpponentScore(data.opponent_score ?? opponentScore);
        setOpponentSolved(data.opponent_solved ?? opponentSolved);

        if (activeModeRef.current === 3) {
          if (data.correct && isPracticeMode) {
            stopGameTimer();
            if (showAlert) {
              showAlert('Congratulations! Puzzle solved correctly.', 'SUCCESS');
            } else {
              alert('Congratulations! Puzzle solved correctly.');
            }
            resetToLobby();
          }
        }
        break;

      case 'opponent_progress':
        setOpponentScore(data.opponent_score);
        setOpponentSolved(data.opponent_solved);
        break;

      case 'match_ended': {
        stopGameTimer();
        const isWinner = data.winner_id && data.winner_id === user?.id;
        if (isWinner) {
          playSynthSound('victory');
        } else {
          playSynthSound('end');
        }
        setIsLoading(false);
        setResultsData(data);
        setGameScreen('results');
        if (data.player1 && data.player2) {
          const imP1 = data.player1.user_id === user?.id;
          const me = imP1 ? data.player1 : data.player2;
          setUser(prev => prev ? { ...prev, elo: me.elo_after } : null);
        }
        break;
      }

      case 'error':
        setIsLoading(false);
        if (showAlert) {
          showAlert(data.message || 'System packet parsing error.', 'SYSTEM ERROR');
        } else {
          alert(data.message || 'System packet parsing error.');
        }
        break;

      case 'ping':
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'pong' }));
        }
        break;

      default:
        break;
    }
  };

  const handleFindMatch = (mode = currentMode) => {
    if (isActionThrottled) return;
    throttleAction();
    setCurrentMode(mode);
    activeModeRef.current = mode;
    setIsLoading(true);
    setIsFriendMatch(false);
    setLoadingMsg('CONNECTING TO COMBAT PROTOCOLS...');
    connectWS(mode, false, (ws) => {
      ws.send(JSON.stringify({ type: 'join_queue' }));
    });
  };

  const handleLeaveQueue = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'leave_queue' }));
    }
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (err) {
        console.error('Error closing queue socket:', err);
      }
      wsRef.current = null;
    }
    stopQueueTimer();
    setGameScreen('lobby');
  };

  const handleCreateFriendRoom = (mode = currentMode) => {
    if (isActionThrottled) return;
    throttleAction();
    setCurrentMode(mode);
    activeModeRef.current = mode;
    setIsLoading(true);
    setLoadingMsg('GENERATING SECURE DUEL CODE...');
    connectWS(mode, false, (ws) => {
      ws.send(JSON.stringify({ type: 'create_friend_room' }));
    });
  };

  const handleCancelFriendRoom = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'cancel_friend_room' }));
    }
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (err) {
        console.error('Error closing room socket:', err);
      }
      wsRef.current = null;
    }
    setFriendRoomCode(null);
    setGameScreen('lobby');
    setJoinCodeInput('');
  };

  const handleJoinFriendRoom = (e) => {
    e.preventDefault();
    if (isActionThrottled) return;
    const code = joinCodeInput.trim().toUpperCase();
    if (code.length !== 6) {
      if (showAlert) {
        showAlert('Room codes must be exactly 6 characters.', 'INVALID CODE');
      } else {
        alert('Room codes must be exactly 6 characters.');
      }
      return;
    }
    throttleAction();
    setIsLoading(true);
    setLoadingMsg('DECRYPTING COMBAT CHANNEL...');
    connectWS(currentMode, false, (ws) => {
      ws.send(JSON.stringify({ type: 'join_friend_room', room_code: code }));
    });
  };

  const handleResign = () => {
    const msg = isPracticeMode
      ? 'Abort this practice session?'
      : isFriendMatch
      ? 'Forfeit this match? This records a loss'
      : 'Forfeit this match? This records a loss and deducts ELO';

    if (showConfirm) {
      showConfirm(
        msg,
        () => {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'resign' }));
            setIsLoading(true);
            setLoadingMsg('WAITING FOR FINAL ARENA SCORECARD...');
          } else {
            stopGameTimer();
            resetToLobby();
          }
        },
        null,
        'FORFEIT CONFIRMATION'
      );
    } else {
      if (window.confirm(msg)) {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'resign' }));
          setIsLoading(true);
          setLoadingMsg('WAITING FOR FINAL ARENA SCORECARD...');
        } else {
          stopGameTimer();
          resetToLobby();
        }
      }
    }
  };

  const handleStartPractice = async (mode = currentMode) => {
    setCurrentMode(mode);
    activeModeRef.current = mode;
    setIsPracticeMode(true);
    setIsFriendMatch(false);
    setIsDailyChallengeMode(false);
    setIsSpamLocked(false);
    setMyScore(0);
    setMySolved(0);

    if (mode !== 3) {
      setIsLoading(true);
      setLoadingMsg('INITIALIZING CORE PRACTICE CIRCUITS...');
      try {
        const res = await practiceService.getQuestions(mode);
        setPracticeQuestions(res.questions);
        setCurrentQuestionIndex(0);
        setCurrentQuestion(res.questions[0]);
        solveTimesRef.current = [];
        setGameScreen('match');
        startCountdown(res.duration_seconds || 60);
        playSynthSound('start');
        questionStartRef.current = Date.now();
      } catch (e) {
        if (showAlert) {
          showAlert(`Failed loading practice questions: ${e.message}`, 'PRACTICE ERROR');
        } else {
          alert(`Failed loading practice questions: ${e.message}`);
        }
        setIsPracticeMode(false);
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(true);
      setLoadingMsg('INITIALIZING CORE PRACTICE PUZZLE...');
      try {
        const data = await practiceService.getMode3Random();
        setPuzzleData(data.puzzle_data);
        setCurrentPuzzleId(data.id);
        setUserAnswers({});
        setGameScreen('match');
        startStopwatch();
        playSynthSound('start');
      } catch (e) {
        if (showAlert) {
          showAlert(`Failed loading practice grid: ${e.message}`, 'PRACTICE ERROR');
        } else {
          alert(`Failed loading practice grid: ${e.message}`);
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleStartDailyChallenge = async () => {
    if (isActionThrottled) return;
    throttleAction();
    setIsLoading(true);
    setLoadingMsg('FETCHING DAILY PUZZLE...');
    try {
      const puzzle = await dailyService.getDailyPuzzle();
      setIsPracticeMode(false);
      setIsFriendMatch(false);
      setIsDailyChallengeMode(true);
      setIsSpamLocked(false);
      setCurrentMode(3);
      activeModeRef.current = 3;
      setMyScore(0);
      setMySolved(0);
      setPuzzleData(puzzle.puzzle_data);
      setCurrentPuzzleId(puzzle.id);
      setUserAnswers({});
      setGameScreen('match');
      startStopwatch();
      playSynthSound('start');
    } catch (e) {
      if (e.message === 'ALREADY_ATTEMPTED') {
        if (showAlert) {
          showAlert("You have already attempted today's Daily Challenge. Return in 24 hours.", 'ALREADY ATTEMPTED');
        } else {
          alert("You have already attempted today's Daily Challenge. Return in 24 hours.");
        }
      } else if (e.message === 'UNAVAILABLE') {
        if (showAlert) {
          showAlert('The Daily Challenge is currently offline or unavailable.', 'MISSION OFFLINE');
        } else {
          alert('The Daily Challenge is currently offline or unavailable.');
        }
      } else {
        if (showAlert) {
          showAlert(`Failed to initiate Daily Challenge: ${e.message}`, 'DAILY SERVICE ERROR');
        } else {
          alert(`Failed to initiate Daily Challenge: ${e.message}`);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const submitGateAnswer = (gateId) => {
    if (isPracticeMode) {
      const expectedAns = activeModeRef.current === 1
        ? evaluateMode1BuggyGate(currentQuestion.circuit)
        : evaluateMode2Circuit(currentQuestion.circuit);
      const isCorrect = expectedAns !== null && gateId === expectedAns;
      triggerFlash(isCorrect);

      const elapsedMs = Date.now() - questionStartRef.current;

      let newScore = myScore;
      let newSolved = mySolved;
      if (isCorrect) {
        newScore += 1;
        newSolved += 1;
        solveTimesRef.current.push(elapsedMs);
      } else {
        newScore -= 2;
      }
      setMyScore(newScore);
      setMySolved(newSolved);

      const nextIndex = currentQuestionIndex + 1;
      if (nextIndex < practiceQuestions.length) {
        setCurrentQuestionIndex(nextIndex);
        setCurrentQuestion(practiceQuestions[nextIndex]);
        questionStartRef.current = Date.now();
      } else {
        endLocalPracticeMatch('all_questions_answered', newScore, newSolved, nextIndex);
      }
    } else {
      const expectedAns = activeModeRef.current === 1
        ? evaluateMode1BuggyGate(currentQuestion.circuit)
        : evaluateMode2Circuit(currentQuestion.circuit);
      const isCorrect = expectedAns !== null && gateId === expectedAns;
      triggerFlash(isCorrect);

      let newScore = myScore;
      let newSolved = mySolved;
      if (isCorrect) {
        newScore += 1;
        newSolved += 1;
      } else {
        newScore -= 2;
      }
      setMyScore(newScore);
      setMySolved(newSolved);

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'submit_answer',
          answer: gateId,
          question_index: currentQuestionIndex
        }));
      }

      const nextIndex = currentQuestionIndex + 1;
      if (nextIndex < practiceQuestions.length) {
        setCurrentQuestionIndex(nextIndex);
        setCurrentQuestion(practiceQuestions[nextIndex]);
        questionStartRef.current = Date.now();
      } else {
        setIsSpamLocked(true);
      }
    }
  };

  const submitBinaryAnswer = (val) => {
    const ans = typeof val === 'string' ? val : binaryAnswerInput.trim();
    if (!ans) return;

    if (isPracticeMode) {
      const expectedAns = evaluateMode2Circuit(currentQuestion.circuit);
      const isCorrect = expectedAns !== null && ans === expectedAns;
      triggerFlash(isCorrect);

      const elapsedMs = Date.now() - questionStartRef.current;

      let newScore = myScore;
      let newSolved = mySolved;
      if (isCorrect) {
        newScore += 1;
        newSolved += 1;
        solveTimesRef.current.push(elapsedMs);
      } else {
        newScore -= 2;
      }
      setMyScore(newScore);
      setMySolved(newSolved);

      const nextIndex = currentQuestionIndex + 1;
      if (nextIndex < practiceQuestions.length) {
        setCurrentQuestionIndex(nextIndex);
        setCurrentQuestion(practiceQuestions[nextIndex]);
        setBinaryAnswerInput('');
        questionStartRef.current = Date.now();
      } else {
        endLocalPracticeMatch('all_questions_answered', newScore, newSolved, nextIndex);
      }
    } else {
      const expectedAns = evaluateMode2Circuit(currentQuestion.circuit);
      const isCorrect = expectedAns !== null && ans === expectedAns;
      triggerFlash(isCorrect);

      let newScore = myScore;
      let newSolved = mySolved;
      if (isCorrect) {
        newScore += 1;
        newSolved += 1;
      } else {
        newScore -= 2;
      }
      setMyScore(newScore);
      setMySolved(newSolved);

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'submit_answer',
          answer: ans,
          question_index: currentQuestionIndex
        }));
      }

      const nextIndex = currentQuestionIndex + 1;
      if (nextIndex < practiceQuestions.length) {
        setCurrentQuestionIndex(nextIndex);
        setCurrentQuestion(practiceQuestions[nextIndex]);
        setBinaryAnswerInput('');
        questionStartRef.current = Date.now();
      } else {
        setIsSpamLocked(true);
      }
    }
  };

  const submitCrosswordAnswer = async () => {
    const blanks = puzzleData.cells.filter(c => !c.is_static);
    if (Object.keys(userAnswers).length < blanks.length) {
      if (showAlert) {
        showAlert('Fill all logical coordinate slots before submission.', 'INCOMPLETE GRID');
      } else {
        alert('Fill all logical coordinate slots before submission.');
      }
      return;
    }

    if (isDailyChallengeMode) {
      setIsLoading(true);
      setLoadingMsg('COMMITTING COMPLETED LOGICAL SOLUTIONS...');
      const elapsedMs = Math.floor(Date.now() - timerStartRef.current);
      try {
        const verify = await dailyService.verifyDailyPuzzle(userAnswers, elapsedMs);
        setIsLoading(false);
        triggerFlash(verify.correct);
        stopGameTimer();

        setTimeout(() => {
          if (verify.correct) {
            if (showAlert) {
              showAlert(`CYCLE COMPLETED: Solved today's Daily Crossword in ${(elapsedMs / 1000).toFixed(1)}s! Streak extended.`, 'MISSION COMPLETED');
            } else {
              alert(`CYCLE COMPLETED: Solved today's Daily Crossword in ${(elapsedMs / 1000).toFixed(1)}s! Streak extended.`);
            }
          } else {
            if (showAlert) {
              showAlert('CYCLE ERROR: The submitted grid values do not compute. Attempt recorded.', 'CYCLE FAULT');
            } else {
              alert('CYCLE ERROR: The submitted grid values do not compute. Attempt recorded.');
            }
          }
          if (loadDailyLeaderboard) {
            loadDailyLeaderboard();
          }
          authService.getMe()
            .then(profile => {
              if (setUser) setUser(profile);
            })
            .catch(err => {
              console.error('Failed to sync profile after daily solve:', err);
            });
          resetToLobby();
        }, 1000);
      } catch (e) {
        setIsLoading(false);
        if (showAlert) {
          showAlert(`Verification post failure: ${e.message}`, 'SERVER FAULT');
        } else {
          alert(`Verification post failure: ${e.message}`);
        }
      }
    } else if (isPracticeMode) {
      const isCorrect = evaluateMode3Crossword(puzzleData, userAnswers);
      triggerFlash(isCorrect);

      if (isCorrect) {
        stopGameTimer();
        setTimeout(() => {
          if (showAlert) {
            showAlert('CIRCUIT COMPLETED: Practice puzzle solved successfully.', 'PRACTICE COMPLETED');
          } else {
            alert('CIRCUIT COMPLETED: Practice puzzle solved successfully.');
          }
          resetToLobby();
        }, 1000);
      } else {
        if (showAlert) {
          showAlert('CIRCUIT ERROR: Circuit layout invalid. Trace signal logic.', 'LOGIC ERROR');
        } else {
          alert('CIRCUIT ERROR: Circuit layout invalid. Trace signal logic.');
        }
      }
    } else {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        setIsLoading(true);
        setLoadingMsg('EVALUATING CIRCUIT GRID SOLUTION...');
        wsRef.current.send(JSON.stringify({
          type: 'submit_answer',
          user_answers: userAnswers
        }));
      }
    }
  };

  const startCountdown = (durationSeconds) => {
    timerEndRef.current = Date.now() + durationSeconds * 1000;
    lastTickSecondRef.current = Math.ceil(durationSeconds);
    setIsTimerUrgent(false);
    updateCountdownTimer();

    clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      if (updateCountdownTimerRef.current) {
        updateCountdownTimerRef.current();
      }
    }, 100);
  };

  const updateCountdownTimer = () => {
    const rem = Math.max(0, (timerEndRef.current - Date.now()) / 1000);
    setTimerDisplay(rem.toFixed(1));
    setIsTimerUrgent(rem <= 5.0);

    const secondsFloor = Math.floor(rem);
    if (secondsFloor > 0 && secondsFloor <= 3 && secondsFloor !== lastTickSecondRef.current) {
      lastTickSecondRef.current = secondsFloor;
      playSynthSound('tick');
    }

    if (rem <= 0) {
      clearInterval(timerIntervalRef.current);
      if (isPracticeMode) {
        endLocalPracticeMatch('timer_expired');
      } else {
        setIsLoading(true);
        setLoadingMsg('WAITING FOR FINAL ARENA SCORECARD...');
      }
    }
  };

  const endLocalPracticeMatch = (reason, finalScore, finalSolved, finalAttempted) => {
    stopGameTimer();
    playSynthSound('end');

    const solvedCount = finalSolved !== undefined ? finalSolved : mySolved;
    const attemptedCount = finalAttempted !== undefined ? finalAttempted : currentQuestionIndex;
    const scoreVal = finalScore !== undefined ? finalScore : myScore;

    const solveTimes = solveTimesRef.current;
    const solvePct = attemptedCount > 0 ? Math.round((solvedCount / attemptedCount) * 100 * 10) / 10 : 0;
    const avgSolveTime = solveTimes.length > 0 ? Math.round((solveTimes.reduce((a, b) => a + b, 0) / solveTimes.length) * 10) / 10 : 0;
    const fastestSolveTime = solveTimes.length > 0 ? Math.round(Math.min(...solveTimes) * 10) / 10 : 0;

    const stats = {
      score: scoreVal,
      questions_solved: solvedCount,
      questions_attempted: attemptedCount,
      total_questions: 20,
      solve_percentage: solvePct,
      avg_solve_time_ms: avgSolveTime,
      fastest_solve_time_ms: fastestSolveTime
    };

    setResultsData({
      reason: reason,
      stats: stats
    });
    setGameScreen('results');
  };

  const startStopwatch = () => {
    timerStartRef.current = Date.now();
    setTimerDisplay('0.0');
    setIsTimerUrgent(false);

    clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - timerStartRef.current) / 1000;
      setTimerDisplay(elapsed.toFixed(1));
    }, 100);
  };

  const startQueueTimer = () => {
    queueStartRef.current = Date.now();
    setQueueElapsed(0);

    clearInterval(queueIntervalRef.current);
    queueIntervalRef.current = setInterval(() => {
      const el = Math.floor((Date.now() - queueStartRef.current) / 1000);
      setQueueElapsed(el);
    }, 1000);
  };

  const stopQueueTimer = () => {
    clearInterval(queueIntervalRef.current);
  };

  const stopGameTimer = () => {
    clearInterval(timerIntervalRef.current);
  };

  const resetToLobby = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    stopGameTimer();
    stopQueueTimer();
    setGameScreen('lobby');
    setIsPracticeMode(false);
    setIsDailyChallengeMode(false);
    setIsFriendMatch(false);
    setIsSpamLocked(false);
    setJoinCodeInput('');
    loadGlobalLeaderboard();
  };

  return {
    currentMode,
    setCurrentMode,
    gameScreen,
    setGameScreen,
    isPracticeMode,
    isDailyChallengeMode,
    isFriendMatch,
    isSpamLocked,
    isActionThrottled,
    opponentName,
    opponentElo,
    isBotMatch,
    countdownNum,
    myScore,
    mySolved,
    opponentScore,
    opponentSolved,
    timerDisplay,
    isTimerUrgent,
    currentQuestion,
    puzzleData,
    userAnswers,
    setUserAnswers,
    binaryAnswerInput,
    setBinaryAnswerInput,
    friendRoomCode,
    joinCodeInput,
    setJoinCodeInput,
    resultsData,
    queueElapsed,
    answerFeedback,
    flashStyle,
    handleFindMatch,
    handleLeaveQueue,
    handleCreateFriendRoom,
    handleCancelFriendRoom,
    handleJoinFriendRoom,
    handleResign,
    handleStartPractice,
    handleStartDailyChallenge,
    submitGateAnswer,
    submitBinaryAnswer,
    submitCrosswordAnswer,
    resetToLobby
  };
}
