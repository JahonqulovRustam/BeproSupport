import apiClient from './apiClient';
import { User } from '../types';

// ─── Backend types (from Swagger) ────────────────────────────────────────────
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

interface UserUpdate {
  firstName?: string;
  lastName?: string;
  password?: string;
}

// ─── Mapper ───────────────────────────────────────────────────────────────────
const mapUser = (u: UserResponse): User => ({
  id: u.id.toString(),
  name: `${u.firstName} ${u.lastName}`.trim(),
  login: u.username,
  role: u.role === 'ADMIN' ? 'ADMIN' : 'EMPLOYEE',
  avatar: `https://api.dicebear.com/7.x/shapes/svg?seed=${u.username}`,
});

// ─── Service ──────────────────────────────────────────────────────────────────
export const userService = {
  async login(login: string, password: string): Promise<User> {
    // POST /auth/login → returns plain string JWT token
    const authResponse = await apiClient.post<string>('/auth/login', {
      username: login,
      password: password,
    });

    const token = authResponse.data;
    console.log('✅ Token received:', typeof token, token?.substring(0, 30) + '...');

    // Save token — interceptor picks it up for all subsequent requests
    localStorage.setItem('bepro_jwt', token);
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    // Fetch actual user profile for real role, name, id
    try {
      const usersResponse = await apiClient.get<UserResponse[]>('/api/users');
      const me = usersResponse.data.find(u => u.username === login);
      if (me) {
        console.log('✅ User profile found:', me);
        return mapUser(me);
      }
    } catch (e) {
      console.warn('Could not fetch user profile, using JWT fallback');
    }

    // Fallback — decode role from JWT payload
    let role: 'ADMIN' | 'EMPLOYEE' = 'EMPLOYEE';
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log('🔍 JWT payload:', payload);
      const auth: string = payload.role || payload.roles?.[0] || payload.authorities?.[0]?.authority || '';
      if (auth.includes('ADMIN')) role = 'ADMIN';
    } catch (e) {
      console.warn('Could not decode JWT payload');
    }

    return {
      id: 'u-remote',
      name: login,
      login,
      role,
      avatar: `https://api.dicebear.com/7.x/shapes/svg?seed=${login}`,
    };
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
    const response = await apiClient.patch<UserResponse>(`/api/users/${id}`, update);
    return mapUser(response.data);
  },

  async deleteUser(id: string): Promise<void> {
    // Swagger shows id as query param for DELETE /api/users/{id}
    await apiClient.delete(`/api/users/${id}`, { params: { id } });
  },
};