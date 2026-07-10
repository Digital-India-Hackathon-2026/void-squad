import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 60000, // 60s for scan requests (Gemini can be slow)
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: inject JWT on every call ─────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('decode_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: handle 401 globally ─────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('decode_token');
      localStorage.removeItem('decode_user');
      window.location.href = '/auth';
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
};

// ── Profile ───────────────────────────────────────────────────────────────────
export const profileAPI = {
  save: (data) => api.post('/profile', data),
  get: (userId) => api.get(`/profile/${userId}`),
};

// ── Scan ──────────────────────────────────────────────────────────────────────
export const scanAPI = {
  analyze: (data) => api.post('/scan', data),
  proceedAnyway: (data) => api.post('/scan/proceed-anyway', data),
  history: (userId) => api.get(`/scan/history/${userId}`),
  getById: (scanId) => api.get(`/scan/${scanId}`),
};


// Chat
export const chatAPI = {
  send: (data) => api.post('/chat', data),
};

// Translation
export const translateAPI = {
  translateScan: (data) => api.post('/translate', data),
};

export default api;
