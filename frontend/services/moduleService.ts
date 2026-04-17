import apiClient from './apiClient';
import { SystemModule, Lesson, Question, Media, SubModule, Quiz } from '../types';

// ─── Backend response types (from Swagger) ───────────────────────────────────
interface MediaResponse {
  id: number;
  type: 'VIDEO' | 'IMAGE' | 'OTHER';
  url: string;
}

interface QuestionResponse {
  id: number;
  text: string;
  options: string[];
  correctAns: string;
}

interface QuizResponseData {
  id: number;
  name: string;
  questions: QuestionResponse[];
}

interface LessonResponse {
  id: number;
  title: string;
  description: string;
  questions: QuestionResponse[];
  module: number;
  subModule?: number;
  media: MediaResponse[];
}

interface SubModuleResponse {
  id: number;
  name: string;
  moduleResponse: number;
  lessons: LessonResponse[];
  quizResponse?: QuizResponseData | null;
}

interface ModuleResponse {
  id: number;
  title: string;
  description: string;
  icon?: string;
  subModules?: SubModuleResponse[];
  lessons?: LessonResponse[];
}

interface ModuleRequest {
  title: string;
  description: string;
}

// ─── Mappers ─────────────────────────────────────────────────────────────────
const mapMedia = (m: MediaResponse): Media => ({
  id: m.id.toString(),
  type: m.type,
  url: m.url,
});

const mapQuestion = (q: QuestionResponse): Question => ({
  id: q.id.toString(),
  text: q.text,
  options: q.options,
  correctAnswer: q.options.indexOf(q.correctAns),
});

const mapLesson = (l: LessonResponse): Lesson => ({
  id: l.id.toString(),
  title: l.title,
  description: l.description,
  videoUrl: l.media?.find(m => m.type === 'VIDEO')?.url || '',
  media: (l.media || []).map(mapMedia),
});

const mapQuiz = (q: QuizResponseData): Quiz => ({
  id: q.id.toString(),
  name: q.name,
  questions: (q.questions || []).map(mapQuestion),
  subModuleId: '',
});

const mapSubModule = (s: SubModuleResponse): SubModule => ({
  id: s.id.toString(),
  name: s.name,
  moduleResponse: s.moduleResponse?.toString(),
  lessons: (s.lessons || []).map(mapLesson),
  quizResponse: s.quizResponse ? mapQuiz(s.quizResponse) : null,
});

const mapModule = (m: ModuleResponse): SystemModule => ({
  id: m.id.toString(),
  name: m.title,
  description: m.description,
  icon: m.icon || 'fa-folder',
  subModules: (m.subModules || []).map(mapSubModule),
  lessons: (m.lessons || []).map(mapLesson),
});

// ─── Service ──────────────────────────────────────────────────────────────────
export const moduleService = {
  async getAllModules(): Promise<SystemModule[]> {
    const response = await apiClient.get<ModuleResponse[]>('/api/modules');
    return response.data.map(mapModule);
  },

  async getModuleById(id: string): Promise<SystemModule> {
    const response = await apiClient.get<ModuleResponse>(`/api/modules/${id}`);
    return mapModule(response.data);
  },

  async createModule(module: ModuleRequest & { icon?: string }): Promise<SystemModule> {
    // Send icon as well if provided
    const response = await apiClient.post<ModuleResponse>('/api/modules', module);
    return mapModule(response.data);
  },

  async updateModule(id: string, data: { title: string; description: string; icon?: string }): Promise<SystemModule> {
    // Send icon as well if provided
    const response = await apiClient.put<ModuleResponse>(`/api/modules/${id}`, data);
    return mapModule(response.data);
  },

  async deleteModule(id: string): Promise<void> {
    await apiClient.delete(`/api/modules/${id}`);
  },

  // ─── SubModule Operations ─────────────────────────────────────────────────────

  /**
   * Get all sub-modules
   * GET /api/submodules
   */
  async getAllSubModules(): Promise<SubModule[]> {
    const response = await apiClient.get<SubModuleResponse[]>('/api/submodules');
    return response.data.map(mapSubModule);
  },

  /**
   * Create a new sub-module
   * POST /api/submodules
   */
  async createSubModule(name: string, moduleId: number): Promise<SubModule> {
    const payload = {
      name,
      systemModuleId: moduleId,
    };
    const response = await apiClient.post<SubModuleResponse>('/api/submodules', payload);
    return mapSubModule(response.data);
  },

  /**
   * Update a sub-module by ID
   * PUT /api/submodules/{id}
   */
  async updateSubModule(id: string, data: { name: string; systemModuleId?: number }): Promise<SubModule> {
    const response = await apiClient.put<SubModuleResponse>(`/api/submodules/${id}`, data);
    return mapSubModule(response.data);
  },

  /**
   * Delete a sub-module by ID
   * DELETE /api/submodules/{id}
   */
  async deleteSubModule(id: string): Promise<void> {
    await apiClient.delete(`/api/submodules/${id}`);
  },

  // ─── Lesson Operations ────────────────────────────────────────────────────────

  /**
   * Get all lessons (with optional module_id filter)
   * GET /api/lessons?module_id=...
   */
  async getAllLessons(moduleId?: string): Promise<Lesson[]> {
    const params = moduleId ? { module_id: moduleId } : {};
    const response = await apiClient.get<LessonResponse[]>('/api/lessons', { params });
    return response.data.map(mapLesson);
  },

  /**
   * Get lessons by module ID
   * GET /api/lessons/{id}
   */
  async getLessonsByModule(moduleId: string): Promise<LessonResponse> {
    const response = await apiClient.get<LessonResponse>(`/api/lessons/${moduleId}`);
    return response.data;
  },

  /**
   * Create a new lesson with media files
   * POST /api/lessons (multipart/form-data)
   * Accepts JSON lesson data and optional files
   */
  async createLesson(
    title: string,
    description: string,
    moduleId: number,
    subModuleId?: number,
    files?: File[],
    externalMedia?: { externalUrl: string; type: 'VIDEO' | 'IMAGE' | 'OTHER' }[]
  ): Promise<Lesson> {
    const formData = new FormData();

    // Create lesson JSON object
    const lessonData = {
      title,
      description,
      moduleId,
      subModuleId: subModuleId || null,
      externalMedia: externalMedia || [],
    };

    // Append lesson as JSON blob
    formData.append(
      'lesson',
      new Blob([JSON.stringify(lessonData)], { type: 'application/json' })
    );

    // Append files if provided
    if (files && files.length > 0) {
      files.forEach((file) => formData.append('file', file));
    }

    const response = await apiClient.post<LessonResponse>('/api/lessons', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return mapLesson(response.data);
  },

  /**
   * Update a lesson by ID
   * PUT /api/lessons/{id}
   */
  async updateLesson(
    id: string,
    data: { title?: string; description?: string }
  ): Promise<Lesson> {
    const response = await apiClient.put<LessonResponse>(`/api/lessons/${id}`, data);
    return mapLesson(response.data);
  },

  /**
   * Delete a lesson by ID
   * DELETE /api/lessons/{id}
   */
  async deleteLesson(id: string): Promise<void> {
    await apiClient.delete(`/api/lessons/${id}`);
  },

  // ─── Media Operations ─────────────────────────────────────────────────────────

  /**
   * Get media metadata for a lesson
   * GET /api/media/{lesson_id}
   */
  async getMediaByLesson(lessonId: string): Promise<Media[]> {
    const response = await apiClient.get<MediaResponse[]>(`/api/media/${lessonId}`);
    return response.data.map(mapMedia);
  },

  /**
   * Stream media file
   * GET /api/media/stream/{id}
   */
  async streamMedia(mediaId: string): Promise<Blob> {
    const response = await apiClient.get<Blob>(`/api/media/stream/${mediaId}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Upload a media file for a lesson
   * POST /api/media/upload?lessonId={lessonId}
   */
  async uploadMedia(lessonId: string, file: File): Promise<Media> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<MediaResponse>(
      `/api/media/upload?lessonId=${lessonId}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return mapMedia(response.data);
  },

  /**
   * Add external media link to a lesson
   * POST /api/media/external?lessonId={lessonId}
   */
  async addExternalMedia(
    lessonId: string,
    externalUrl: string,
    type: 'VIDEO' | 'IMAGE' | 'OTHER'
  ): Promise<Media> {
    const response = await apiClient.post<MediaResponse>(
      `/api/media/external?lessonId=${lessonId}`,
      { externalUrl, type }
    );
    return mapMedia(response.data);
  },

  /**
   * Delete media by ID
   * DELETE /api/media/{id}
   */
  async deleteMedia(mediaId: string): Promise<void> {
    await apiClient.delete(`/api/media/${mediaId}`);
  },
};