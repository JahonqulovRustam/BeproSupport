
import apiClient from './apiClient';
import { User } from '../types';

export const userService = {
    async login(login: string, password: string): Promise<User> {
        // Send a request to get all users (protected) using these credentials
        // If it fails with 401, credentials are wrong.
        // In a real app, you'd have /api/me
        const credentials = btoa(`${login}:${password}`);
        const response = await apiClient.get<any[]>('/users', {
            headers: {
                'Authorization': `Basic ${credentials}`
            }
        });

        // Find the user who just logged in or return a generic user object
        // For now, let's assume if it succeeds, we're good.
        const userResponse = response.data.find(u => u.username === login);

        return {
            id: userResponse?.id.toString() || 'u-remote',
            name: userResponse ? `${userResponse.firstName} ${userResponse.lastName}` : login,
            login: login,
            password: password,
            role: userResponse?.role || 'EMPLOYEE',
            avatar: `https://api.dicebear.com/7.x/shapes/svg?seed=${login}`
        };
    },

    async getAllUsers(): Promise<User[]> {
        const response = await apiClient.get<any[]>('/users');
        return response.data.map(u => ({
            id: u.id.toString(),
            name: `${u.firstName} ${u.lastName}`,
            login: u.username,
            role: u.role,
            avatar: `https://api.dicebear.com/7.x/shapes/svg?seed=${u.username}`
        }));
    },

    async createUser(user: { firstName: string; lastName: string; username: string; password: string; role: string }): Promise<any> {
        const response = await apiClient.post('/users', user);
        return response.data;
    }
};
