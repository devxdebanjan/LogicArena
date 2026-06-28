// Central API Client Utility for Logic Arena

const getApiBase = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  return `http://${window.location.hostname}:8000/api/v1`;
};

const getWsBase = () => {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;
  return `ws://${window.location.hostname}:8000/api/v1`;
};

export const API_BASE = getApiBase();
export const WS_BASE = getWsBase();

export let accessToken = localStorage.getItem('la_access_token') || null;

export const setAccessToken = (token) => {
  accessToken = token;
  if (token) {
    localStorage.setItem('la_access_token', token);
  } else {
    localStorage.removeItem('la_access_token');
  }
};

// Custom fetch wrapper that injects Authorization headers and handles auto refresh

export async function apiFetch(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const url = `${API_BASE}${path}`;

  let response;
  try {
    response = await fetch(url, {
      credentials: 'include',
      ...options,
      headers,
    });
  } catch (error) {
    console.error(`Network error on fetch ${path}:`, error);
    throw error;
  }

  // Auto refresh token on 401 Unauthorized, except for login paths
  if (response.status === 401 && path !== '/auth/guest' && path !== '/auth/refresh') {
    try {
      const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include', // Vital to send the httpOnly refresh cookie
      });

      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        setAccessToken(refreshData.access_token);

        // Retry original request
        headers['Authorization'] = `Bearer ${refreshData.access_token}`;
        response = await fetch(url, {
          ...options,
          headers,
        });
      } else {
        // Refresh token failed/expired
        setAccessToken(null);
      }
    } catch (refreshError) {
      console.error('Failed to auto refresh token:', refreshError);
      setAccessToken(null);
    }
  }

  return response;
}

export const authService = {
  async guestSignup() {
    const res = await apiFetch('/auth/guest', {
      method: 'POST',
    });
    if (!res.ok) throw new Error(`Guest signup failed: ${res.status}`);
    const data = await res.json();
    setAccessToken(data.access_token);
    return data;
  },

  async getMe() {
    const res = await apiFetch('/auth/me');
    if (!res.ok) throw new Error(`Fetch profile failed: ${res.status}`);
    return await res.json();
  },

  async googleLogin(idToken) {
    const res = await apiFetch('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ id_token: idToken }),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || `Google authentication failed: ${res.status}`);
    }
    const data = await res.json();
    setAccessToken(data.access_token);
    return data;
  },

  async logout() {
    try {
      await apiFetch('/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (err) {
      console.warn('Silent logout error:', err);
    } finally {
      setAccessToken(null);
      localStorage.clear();
    }
  }
};

export const userService = {
  async getProfile() {
    const res = await apiFetch('/users/me');
    if (!res.ok) throw new Error(`Fetch profile failed: ${res.status}`);
    return await res.json();
  },

  async updateDisplayName(displayName) {
    const res = await apiFetch('/users/me', {
      method: 'PATCH',
      body: JSON.stringify({ display_name: displayName }),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || `Update profile failed: ${res.status}`);
    }
    return await res.json();
  },

  async getPublicProfile(userId) {
    const res = await apiFetch(`/users/${userId}/public`);
    if (!res.ok) throw new Error(`Fetch public profile failed: ${res.status}`);
    return await res.json();
  }
};

export const leaderboardService = {
  async getGlobalLeaderboard() {
    const res = await apiFetch('/leaderboard');
    if (!res.ok) throw new Error(`Fetch global leaderboard failed: ${res.status}`);
    return await res.json();
  }
};

export const dailyService = {
  async getDailyPuzzle() {
    const res = await apiFetch('/daily');
    if (res.status === 403) {
      throw new Error('ALREADY_ATTEMPTED');
    }
    if (res.status === 404) {
      throw new Error('UNAVAILABLE');
    }
    if (!res.ok) throw new Error(`Fetch daily puzzle failed: ${res.status}`);
    return await res.json();
  },

  async verifyDailyPuzzle(userAnswers, solveTimeMs) {
    const res = await apiFetch('/daily/verify', {
      method: 'POST',
      body: JSON.stringify({ user_answers: userAnswers, solve_time_ms: solveTimeMs }),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || `Verification failed: ${res.status}`);
    }
    return await res.json();
  },

  async getDailyLeaderboard() {
    const res = await apiFetch('/daily/leaderboard');
    if (!res.ok) throw new Error(`Fetch daily leaderboard failed: ${res.status}`);
    return await res.json();
  }
};

export const practiceService = {
  async getQuestions(mode) {
    const res = await apiFetch(`/practice/questions?mode=${mode}`);
    if (!res.ok) throw new Error(`Fetch practice questions failed: ${res.status}`);
    return await res.json();
  },

  async getMode3Random() {
    const res = await apiFetch('/mode3/practice/random');
    if (!res.ok) throw new Error(`Fetch practice puzzle failed: ${res.status}`);
    return await res.json();
  },

  async verifyMode3Puzzle(puzzleId, userAnswers) {
    const res = await apiFetch(`/mode3/practice/${puzzleId}/verify`, {
      method: 'POST',
      body: JSON.stringify({ user_answers: userAnswers }),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || `Verification failed: ${res.status}`);
    }
    return await res.json();
  }
};
