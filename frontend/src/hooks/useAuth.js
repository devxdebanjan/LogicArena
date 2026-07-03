import { useState, useEffect } from 'react';
import { authService, userService, accessToken } from '../api';

function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export function useAuth(loadGlobalLeaderboard, showAlert) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState('CONNECTING TO ARENA CORE...');
  const [displayNameInput, setDisplayNameInput] = useState('');

  useEffect(() => {
    async function autoGuestSignup() {
      setLoadingMsg('ALLOCATING CYBER GUEST CREDENTIALS...');
      try {
        const data = await authService.guestSignup();
        setUser(data.user);
        setIsAuthenticated(true);
        setDisplayNameInput(data.user.display_name || '');
      } catch (e) {
        console.error('Auto guest signup failed:', e);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    }

    async function checkAuth() {
      if (accessToken) {
        const claims = parseJwt(accessToken);
        if (claims) {
          setUser({
            id: claims.sub,
            username: 'Loading...',
            is_guest: claims.is_guest,
            elo: 1000
          });
          setIsAuthenticated(true);
        }
        try {
          const profile = await authService.getMe();
          setUser(profile);
          setIsAuthenticated(true);
          setDisplayNameInput(profile.display_name || '');
          setIsLoading(false);
        } catch (e) {
          console.warn('Initial session expired or invalid:', e);
          await authService.logout();
          await autoGuestSignup();
        }
      } else {
        await autoGuestSignup();
      }
    }
    checkAuth();
    if (loadGlobalLeaderboard) {
      loadGlobalLeaderboard();
    }
  }, []);

  const handleGuestLogin = async () => {
    setIsLoading(true);
    setLoadingMsg('ALLOCATING CYBER GUEST CREDENTIALS...');
    try {
      const data = await authService.guestSignup();
      setUser(data.user);
      setIsAuthenticated(true);
      setDisplayNameInput(data.user.display_name || '');
      if (loadGlobalLeaderboard) {
        loadGlobalLeaderboard();
      }
    } catch (e) {
      if (showAlert) {
        showAlert(`Guest credentials allocation failed: ${e.message}`, 'SIGNUP ERROR');
      } else {
        alert(`Guest credentials allocation failed: ${e.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async (resetToLobby) => {
    setIsLoading(true);
    setLoadingMsg('RESTORING SECURE TERMINAL STATE...');
    try {
      await authService.logout();
      setUser(null);
      setIsAuthenticated(false);
      if (resetToLobby) {
        resetToLobby();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setLoadingMsg('SYNCING NAME CONFIG TO DATA VAULT...');
    try {
      const updated = await userService.updateDisplayName(displayNameInput);
      setUser(updated);
      if (showAlert) {
        showAlert('Player display name saved successfully.', 'SUCCESS');
      } else {
        alert('Player display name saved successfully.');
      }
    } catch (e) {
      if (showAlert) {
        showAlert(`Synchronize failed: ${e.message}`, 'UPDATE PROFILE ERROR');
      } else {
        alert(`Synchronize failed: ${e.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuthSuccess = async (idToken) => {
    setIsLoading(true);
    setLoadingMsg('SYNCING PROGRESS WITH GOOGLE CORE...');
    try {
      const data = await authService.googleLogin(idToken);
      setUser(data.user);
      setIsAuthenticated(true);
      setDisplayNameInput(data.user.display_name || '');
      if (loadGlobalLeaderboard) {
        loadGlobalLeaderboard();
      }
      if (showAlert) {
        showAlert('Authentication complete. Player records linked successfully.', 'SUCCESS');
      }
    } catch (e) {
      if (showAlert) {
        showAlert(`Google authentication failed: ${e.message}`, 'AUTHENTICATION FAULT');
      } else {
        alert(`Google authentication failed: ${e.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return {
    user,
    setUser,
    isAuthenticated,
    setIsAuthenticated,
    isLoading,
    setIsLoading,
    loadingMsg,
    setLoadingMsg,
    displayNameInput,
    setDisplayNameInput,
    handleGuestLogin,
    handleLogout,
    handleUpdateProfile,
    handleGoogleAuthSuccess
  };
}
