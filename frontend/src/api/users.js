// ─────────────────────────────────────────────
// API Layer — Users & Staff management (Admin only)
// ─────────────────────────────────────────────

import { apiClient, USE_MOCK } from './auth';

const delay = (ms = 500) => new Promise((r) => setTimeout(r, ms));

// ── Mock data ────────────────────────────────────

let nextUserId = 10;

const MOCK_USERS = [
  {
    id: 1,
    name: 'Arjun Sharma',
    email: 'admin@subtrack.app',
    role: 'admin',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'Priya Mehta',
    email: 'staff@subtrack.app',
    role: 'internal',
    created_at: '2026-02-15T10:00:00Z',
  },
  {
    id: 3,
    name: 'Ravi Kumar',
    email: 'customer@example.com',
    role: 'portal',
    created_at: '2026-03-20T14:30:00Z',
  },
  {
    id: 4,
    name: 'Ananya Roy',
    email: 'ananya@subtrack.app',
    role: 'internal',
    created_at: '2026-04-10T09:15:00Z',
  },
];

// ── API functions ────────────────────────────────

/**
 * GET /users (Admin only)
 */
export async function getUsers(params = {}) {
  if (USE_MOCK) {
    await delay();
    let items = [...MOCK_USERS];
    if (params.search) {
      const q = params.search.toLowerCase();
      items = items.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.role.toLowerCase().includes(q)
      );
    }
    return items;
  }
  const { data } = await apiClient.get('/users', { params });
  return data;
}

/**
 * POST /users (Admin only - add internal staff/users)
 */
export async function createUser(payload) {
  if (USE_MOCK) {
    await delay(400);
    const existing = MOCK_USERS.find((u) => u.email.toLowerCase() === payload.email.toLowerCase());
    if (existing) {
      const err = new Error('Email already registered');
      err.response = { status: 409, data: { detail: 'User with this email already exists.' } };
      throw err;
    }
    const user = {
      id: nextUserId++,
      name: payload.name,
      email: payload.email,
      role: payload.role || 'internal',
      created_at: new Date().toISOString(),
    };
    MOCK_USERS.push(user);
    return user;
  }
  const { data } = await apiClient.post('/users', payload);
  return data;
}

