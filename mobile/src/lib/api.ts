import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://void-squad.onrender.com/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

// Inject JWT on every request
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('decode_token');
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove(['decode_token', 'decode_user']);
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  signup: (data: any) => api.post('/auth/signup', data),
  login:  (data: any) => api.post('/auth/login', data),
};

export const profileAPI = {
  save: (data: any) => api.post('/profile', data),
  get:  (userId: string) => api.get(`/profile/${userId}`),
};

export const scanAPI = {
  analyze:       (data: any) => api.post('/scan', data),
  proceedAnyway: (data: any) => api.post('/scan/proceed-anyway', data),
  history:       (userId: string) => api.get(`/scan/history/${userId}`),
  getById:       (scanId: string) => api.get(`/scan/${scanId}`),
};

export const chatAPI = {
  send: (data: any) => api.post('/chat', data),
};

export const translateAPI = {
  translateScan: (data: any) => api.post('/translate', data),
};

export default api;
