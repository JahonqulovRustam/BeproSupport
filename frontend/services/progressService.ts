import apiClient from './apiClient';

export interface UserProgressResponse {
  userId: number;
  lessonId: number;
  watchPercentage: number;
  lastWatchAt: string;
  completed?: boolean;
  complated?: boolean; // In case of backend typo
}

export const progressService = {
  /**
   * Get progress for a specific user and lesson
   * GET /api/user_progress?u_id={userId}&l_id={lessonId}
   */
  async getLessonProgress(userId: number, lessonId: number): Promise<UserProgressResponse | null> {
    try {
      const response = await apiClient.get<UserProgressResponse | UserProgressResponse[]>('/api/user_progress', {
        params: {
          u_id: userId,
          l_id: lessonId
        }
      });
      
      const data = response.data;
      if (Array.isArray(data)) {
        return data.length > 0 ? data[0] : null;
      }
      return data;
    } catch (error) {
      console.error('Failed to get lesson progress:', error);
      return null; // Return null if not found or error
    }
  },

  /**
   * Update progress for a specific user and lesson
   * POST /api/user_progress
   */
  async updateLessonProgress(userId: number, lessonId: number, watchPercentage: number): Promise<void> {
    try {
      const now = new Date();
      const tzOffset = now.getTimezoneOffset() * 60000; // offset in milliseconds
      const localISOTime = new Date(now.getTime() - tzOffset).toISOString().slice(0, -1); // remove 'Z'

      await apiClient.post('/api/user_progress', {
        userId,
        lessonId,
        watchPercentage: Math.min(100, Math.round(watchPercentage)), // Ensure max 100% and integer
        lastWatchAt: localISOTime
      });
    } catch (error) {
      console.error('Failed to update lesson progress:', error);
    }
  }
};
