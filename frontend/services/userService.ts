import apiClient from './apiClient';
import { User } from '../types';

// ─── Backend types ────────────────────────────────────────────────────────────
interface UserResponse {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  role: 'ADMIN' | 'EMPLOYEE' | 'LEAD';
}

interface UserRequest {
  firstName: string;
  lastName: string;
  username: string;
  password: string;
  role: 'ADMIN' | 'EMPLOYEE' | 'LEAD';
}

export interface UserUpdate {
  firstName?: string;
  lastName?: string;
  password?: string;
  role?: 'ADMIN' | 'EMPLOYEE' | 'LEAD';
}

// ─── Mapper ───────────────────────────────────────────────────────────────────
const mapUser = (u: UserResponse): User => ({
  id: u.id.toString(),
  name: `${u.firstName} ${u.lastName}`.trim(),
  login: u.username,
  role: u.role,
  avatar: `https://api.dicebear.com/7.x/shapes/svg?seed=${u.username}`,
});
  
// ─── Service ──────────────────────────────────────────────────────────────────
export const userService = {
  async login(login: string, password: string): Promise<User> {
    const authResponse = await apiClient.post<string>('/auth/login', {
      username: login,
      password: password,
    });

    const token = authResponse.data;
    localStorage.setItem('bepro_jwt', token);
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    try {
      const usersResponse = await apiClient.get<UserResponse[]>('/api/users');
      const me = usersResponse.data.find(u => u.username === login);
      if (me) return mapUser(me);
    } catch (e) {
      console.warn('Could not fetch user profile, using JWT fallback');
    }

    let role: 'ADMIN' | 'EMPLOYEE' = 'EMPLOYEE';
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const auth: string = payload.role || payload.roles?.[0] || payload.authorities?.[0]?.authority || '';
      if (auth.includes('ADMIN')) role = 'ADMIN';
    } catch (e) {
      console.warn('Could not decode JWT payload');
    }

    return { id: 'u-remote', name: login, login, role, avatar: '' };
  },

  async getAllUsers(): Promise<User[]> {
    const response = await apiClient.get<UserResponse[]>('/api/users');
    return response.data.map(mapUser);
  },

  async getUserById(id: string): Promise<User> {
    const response = await apiClient.get<UserResponse>(`/api/users/${id}`);
    return mapUser(response.data);
  },

  async createUser(user: UserRequest): Promise<User> {
    const response = await apiClient.post<UserResponse>('/api/users', user);
    return mapUser(response.data);
  },

  async updateUser(id: string, update: UserUpdate): Promise<User> {
    // ✅ Build payload — only include non-empty fields
    const payload: UserUpdate = {};
    if (update.firstName?.trim()) payload.firstName = update.firstName.trim();
    if (update.lastName?.trim())  payload.lastName  = update.lastName.trim();
    if (update.password?.trim())  payload.password  = update.password.trim();
    if (update.role)              payload.role      = update.role;

    const response = await apiClient.patch<UserResponse | void>(
      `/api/users/${id}`,
      payload,
      { headers: { 'Content-Type': 'application/json' } }
    );

    // ✅ Backend may return 200 with body OR 204 with no body
    if (response.data && typeof response.data === 'object' && 'id' in response.data) {
      return mapUser(response.data as UserResponse);
    }

    // ✅ 204 — refetch the user to get the updated record
    return userService.getUserById(id);
  },

  async deleteUser(id: string): Promise<void> {
    // ✅ Only path param — no duplicate query param
    await apiClient.delete(`/api/users/${id}`);
  },
};
