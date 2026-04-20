import apiClient from './apiClient';

export interface TestAnswerRequest {
  questionId: number;
  selectedAnswer: string;
}

export interface TestAttemptRequest {
  quizId: number;
  totalQuestions: number;
  answers: TestAnswerRequest[];
}

export interface TestAnswerResponse {
  questionId: number;
  selectedAnswer: string;
  correct: boolean;
}

export interface TestAttemptResponse {
  id: number;
  quizId: number;
  user?: string;
  totalQuestions: number;
  correctAnswers: number;
  scorePercentage: number;
  passed: boolean;
  startedAt: string;
  submittedAt: string;
  answers: TestAnswerResponse[];
}

// Spring Boot LocalDateTime needs "2026-03-12T10:05:30" — no Z, no milliseconds
const toLocalDateTime = (isoString: string): string => isoString.slice(0, 19);

export const testAttemptService = {
  async submit(data: TestAttemptRequest): Promise<TestAttemptResponse> {
    const response = await apiClient.post<TestAttemptResponse>('/api/testAttempts', data);
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
