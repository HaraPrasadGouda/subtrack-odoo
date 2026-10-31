// ─────────────────────────────────────────────
// API Layer — auth endpoints
// USE_MOCK=true uses realistic fake data so the
// UI works without a running backend.
// ─────────────────────────────────────────────

import axios from 'axios';

export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true' || true;

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// ── Axios instance ──────────────────────────────
export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Attach JWT on every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('subtrack_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Redirect to /login on 401
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('subtrack_token');
      localStorage.removeItem('subtrack_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ── Helpers ─────────────────────────────────────
const delay = (ms = 600) => new Promise((res) => setTimeout(res, ms));

// Simulate a 409 conflict for email-exists scenario
const EXISTING_EMAILS = ['admin@subtrack.app', 'test@example.com'];

// ── Mock data ────────────────────────────────────
const MOCK_USER_ADMIN = {
  id: 1,
  name: 'Arjun Sharma',
  email: 'admin@subtrack.app',
  role: 'admin',
  avatar: null,
};

const MOCK_USER_INTERNAL = {
  id: 2,
  name: 'Priya Mehta',
  email: 'staff@subtrack.app',
  role: 'internal',
  avatar: null,
};

const MOCK_USER_PORTAL = {
  id: 3,
  name: 'Ravi Kumar',
  email: 'customer@example.com',
  role: 'portal',
  avatar: null,
};

function mockUserByEmail(email) {
  if (email === 'admin@subtrack.app') return MOCK_USER_ADMIN;
  if (email === 'staff@subtrack.app') return MOCK_USER_INTERNAL;
  return MOCK_USER_PORTAL;
}

// ── Auth API functions ──────────────────────────

/**
 * POST /auth/signup
 */
export async function signup({ name, email, password }) {
  if (USE_MOCK) {
    await delay();
    if (EXISTING_EMAILS.includes(email)) {
      const err = new Error('Email already exists');
      err.response = { status: 409, data: { detail: 'Email already exists. Please log in instead.' } };
      throw err;
    }
    const user = { id: 99, name, email, role: 'internal', avatar: null };
    const token = 'mock_jwt_' + btoa(email);
    return { user, token };
  }

  const { data } = await apiClient.post('/auth/signup', { name, email, password });
  return data;
}

/**
 * POST /auth/login
 */
export async function login({ email, password }) {
  if (USE_MOCK) {
    await delay();
    if (!email || !password) {
      const err = new Error('Invalid credentials');
      err.response = { status: 401, data: { detail: 'Invalid email or password.' } };
      throw err;
    }
    // Accept any non-empty credentials in mock mode
    const user = mockUserByEmail(email);
    const token = 'mock_jwt_' + btoa(email);
    return { user, token };
  }

  const { data } = await apiClient.post('/auth/login', { email, password });
  return data;
}

/**
 * GET /auth/me
 */
export async function getMe() {
  if (USE_MOCK) {
    await delay(300);
    const raw = localStorage.getItem('subtrack_user');
    if (!raw) {
      const err = new Error('Not authenticated');
      err.response = { status: 401, data: { detail: 'Not authenticated.' } };
      throw err;
    }
    return JSON.parse(raw);
  }

  const { data } = await apiClient.get('/auth/me');
  return data;
}

/**
 * POST /auth/forgot-password
 */
export async function forgotPassword({ email }) {
  if (USE_MOCK) {
    await delay();
    // Always succeed in mock mode (don't reveal if email exists)
    return { message: 'If that email is registered, a reset link has been sent.' };
  }

  const { data } = await apiClient.post('/auth/forgot-password', { email });
  return data;
}

/**
 * POST /auth/reset-password
 */
export async function resetPassword({ token, password }) {
  if (USE_MOCK) {
    await delay();
    if (!token || token.length < 6) {
      const err = new Error('Invalid or expired token');
      err.response = { status: 400, data: { detail: 'Reset link is invalid or has expired.' } };
      throw err;
    }
    return { message: 'Password reset successfully. You can now log in.' };
  }

  const { data } = await apiClient.post('/auth/reset-password', { token, password });
  return data;
}

