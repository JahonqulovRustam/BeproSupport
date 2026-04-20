import apiClient from './apiClient';
import { Quiz, Question } from '../types';

// ─── Backend response types (from OpenAPI spec) ────────────────────────────────
interface QuestionResponse {
  id: number;
  text: string;
  options: string[];
  correctAns: string;
  subModule: string;
}

interface QuizResponse {
  id: number;
  name: string;
  questions: QuestionResponse[];
  timeLimitInMinutes?: number | null;
  passingScore?: number | null;
}

interface QuestionRequestBody {
  text: string;
  options: string[];
  correctAns: string;
}

interface QuizRequestWithQuestions {
  name: string;
  subModule_id: number;
  questionRequests: QuestionRequestBody[];
  timeLimitInMinutes: number | null;
  passingScore: number | null;
}

interface QuizRequestBasic {
  name: string;
  subModule_id: number;
  timeLimitInMinutes: number | null;
  passingScore: number | null;
}

interface QuestionRequest {
  text: string;
  options: string[];
  correctAns: string;
  subModule: number;
}

// ─── Mappers ──────────────────────────────────────────────────────────────────
const mapQuestion = (q: QuestionResponse): Question => ({
  id: q.id.toString(),
  text: q.text,
  options: q.options,
  correctAnswer: q.options.indexOf(q.correctAns),
});

const mapQuiz = (q: QuizResponse, subModuleId?: string): Quiz => ({
  id: q.id.toString(),
  name: q.name,
  questions: (q.questions || []).map(mapQuestion),
  subModuleId: subModuleId || '',
  timeLimitInMinutes: q.timeLimitInMinutes ?? null,
  passingScore: q.passingScore ?? null,
});

// ─── Service ──────────────────────────────────────────────────────────────────
export const quizService = {
  /**
   * Create a new quiz with questions in one call
   * POST /api/quiz
   * @param name Quiz name
   * @param subModuleId Sub-module ID
   * @param questions Array of question objects with text, options, and correctAns
   */
  async createQuizWithQuestions(
    name: string,
    subModuleId: number,
    questions: QuestionRequestBody[] = [],
    timeLimitInMinutes: number | null = null,
    passingScore: number | null = null
  ): Promise<Quiz> {
    const payload: QuizRequestWithQuestions = {
      name,
      subModule_id: subModuleId,
      questionRequests: questions,
      timeLimitInMinutes,
      passingScore,
    };
    const response = await apiClient.post<QuizResponse>('/api/quiz', payload);
    return mapQuiz(response.data, subModuleId.toString());
  },

  /**
   * Create a new quiz for a sub-module (without questions)
   * POST /api/quiz
   */
  async createQuiz(
    name: string, 
    subModuleId: number,
    timeLimitInMinutes: number | null = null,
    passingScore: number | null = null
  ): Promise<Quiz> {
    const payload: QuizRequestBasic = {
      name,
      subModule_id: subModuleId,
      timeLimitInMinutes,
      passingScore,
    };
    const response = await apiClient.post<QuizResponse>('/api/quiz', payload);
    return mapQuiz(response.data, subModuleId.toString());
  },

  /**
   * Get quiz by ID
   * GET /api/quiz/{id}
   */
  async getQuizById(id: number): Promise<Quiz> {
    const response = await apiClient.get<QuizResponse>(`/api/quiz/${id}`);
    return mapQuiz(response.data);
  },

  /**
   * Create a question for a quiz/sub-module
   * POST /api/quiz/{quiz_id}/questions
   */
  async createQuestion(
    quizId: number | string,
    text: string,
    options: string[],
    correctAnswer: string,
    subModuleId: number
  ): Promise<Question> {
    const payload: QuestionRequest = {
      text,
      options,
      correctAns: correctAnswer,
      subModule: subModuleId,
    };
    const response = await apiClient.post<QuestionResponse>(`/api/quiz/${quizId}/questions`, payload);
    return mapQuestion(response.data);
  },

  /**
   * Get all questions
   * GET /api/questions
   */
  async getAllQuestions(): Promise<Question[]> {
    const response = await apiClient.get<QuestionResponse[]>('/api/questions');
    return response.data.map(mapQuestion);
  },

  /**
   * Update a question by ID
   * PUT /api/quiz/{quiz_id}/questions/{id}
   */
  async updateQuestion(
    quizId: number | string,
    id: number,
    text: string,
    options: string[],
    correctAnswer: string,
    subModuleId: number
  ): Promise<Question> {
    const payload: QuestionRequest = {
      text,
      options,
      correctAns: correctAnswer,
      subModule: subModuleId,
    };
    const response = await apiClient.put<QuestionResponse>(`/api/quiz/${quizId}/questions/${id}`, payload);
    return mapQuestion(response.data);
  },

  /**
   * Get all questions for a quiz
   * GET /api/quiz/{quiz_id}/questions
   */
  async getQuizQuestions(quizId: string | number): Promise<Question[]> {
    const response = await apiClient.get<QuestionResponse[]>(`/api/quiz/${quizId}/questions`);
    return response.data.map(mapQuestion);
  },

  /**
   * Delete a question by ID
   * DELETE /api/quiz/{quiz_id}/questions/{id}
   */
  async deleteQuestion(quizId: number | string, id: number): Promise<void> {
    await apiClient.delete(`/api/quiz/${quizId}/questions/${id}`);
  },
};
