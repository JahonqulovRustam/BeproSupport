import apiClient from './apiClient';

export interface TestAttemptRequest {
  userId: number;
  lesson: string;
  totalQuestions: number;
  correctAnswers: number;
  startedAt: string;
  submittedAt: string;
}

export interface TestAttemptResponse {
  id: number;
  userId: number;
  lesson: string;           // String — lesson title, matches Swagger
  lessonId?: number;
  totalQuestions: number;
  correctAnswers: number;
  scorePercentage: number;
  passed: boolean;
  startedAt: string;
  submittedAt: string;
}

// Spring Boot LocalDateTime needs "2026-03-12T10:05:30" — no Z, no milliseconds
const toLocalDateTime = (isoString: string): string => isoString.slice(0, 19);

export const testAttemptService = {
  async submit(data: TestAttemptRequest): Promise<TestAttemptResponse> {
    const response = await apiClient.post<TestAttemptResponse>('/api/testAttempts', {
      ...data,
      startedAt: toLocalDateTime(data.startedAt),
      submittedAt: toLocalDateTime(data.submittedAt),
    });
    return response.data;
  },

  // GET /api/testAttempts — all attempts (admin)
  async getLastAttempts(): Promise<TestAttemptResponse[]> {
    const response = await apiClient.get<TestAttemptResponse[]>('/api/testAttempts');
    return response.data;
  },

  // GET /api/testAttempts/{id} — attempts of a specific user
  async getAttemptsByUser(userId: string): Promise<TestAttemptResponse[]> {
    const response = await apiClient.get<TestAttemptResponse[]>(`/api/testAttempts/${userId}`);
    return response.data;
  },

  // GET /api/testAttempts/standing — leaderboard
  async getStandings(): Promise<TestAttemptResponse[]> {
    const response = await apiClient.get<TestAttemptResponse[]>('/api/testAttempts/standing');
    return response.data;
  },
};