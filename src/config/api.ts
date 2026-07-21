
// Configuración de la API
export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${API_BASE_URL}/auth/login`,
    REGISTER: `${API_BASE_URL}/auth/register`,
    PROFILE: `${API_BASE_URL}/auth/me`,
    FORGOT_PASSWORD: `${API_BASE_URL}/auth/forgot-password`,
    RESET_PASSWORD: `${API_BASE_URL}/auth/reset-password`,
  },
  TICKETS: {
    BASE: `${API_BASE_URL}/tickets`,
    BY_ID: (id: string) => `${API_BASE_URL}/tickets/${id}`,
  },
  USERS: {
    BASE: `${API_BASE_URL}/users`,
    BY_ID: (id: string) => `${API_BASE_URL}/users/${id}`,
  },
  DEPARTMENTS: {
    BASE: `${API_BASE_URL}/departments`,
  },
  NOTIFICATIONS: {
    SETTINGS: `${API_BASE_URL}/notifications/settings`,
    UPDATE: (eventType: string) => `${API_BASE_URL}/notifications/settings/${eventType}`,
  },
  STATS: {
    BASE: `${API_BASE_URL}/stats`,
  },
  KB: {
    ARTICLES: `${API_BASE_URL}/kb/articles`,
    CATEGORIES: `${API_BASE_URL}/kb/categories`,
  },
  ADMIN: {
    USERS: `${API_BASE_URL}/admin/users`,
    USER_BY_ID: (id: string) => `${API_BASE_URL}/admin/users/${id}`,
  },
};
