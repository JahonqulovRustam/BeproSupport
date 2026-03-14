import apiClient from './apiClient';
import { SystemModule, Lesson, Question, Media } from '../types';

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

interface LessonResponse {
  id: number;
  title: string;
  description: string;
  questions: QuestionResponse[];
  module: number;
  media: MediaResponse[];
}

interface ModuleResponse {
  id: number;
  title: string;
  description: string;
  lessons: LessonResponse[];
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
  questions: (l.questions || []).map(mapQuestion),
  media: (l.media || []).map(mapMedia),
});

const mapModule = (m: ModuleResponse): SystemModule => ({
  id: m.id.toString(),
  name: m.title,
  description: m.description,
  icon: 'fa-server',
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

  async createModule(module: ModuleRequest): Promise<SystemModule> {
    const response = await apiClient.post<ModuleResponse>('/api/modules', module);
    return mapModule(response.data);
  },

  async deleteModule(id: string): Promise<void> {
    await apiClient.delete(`/api/modules/${id}`);
  },

  // GET /api/lessons?module_id=... (optional filter by module)
  async getLessonsByModule(moduleId?: string): Promise<Lesson[]> {
    const params = moduleId ? { module_id: moduleId } : {};
    const response = await apiClient.get<LessonResponse[]>('/api/lessons', { params });
    return response.data.map(mapLesson);
  },

  // POST /api/lessons (multipart/form-data)
  async createLesson(lessonData: {
    title: string;
    description: string;
    moduleId: number;
    questions?: { text: string; options: string[]; correctAns: string }[];
    externalMedia?: { externalUrl: string; type: 'VIDEO' | 'IMAGE' | 'OTHER' }[];
  }, files: File[]): Promise<Lesson> {
    const formData = new FormData();
    formData.append('lesson', new Blob([JSON.stringify(lessonData)], { type: 'application/json' }));
    files.forEach(file => formData.append('file', file));

    const response = await apiClient.post<LessonResponse>('/api/lessons', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return mapLesson(response.data);
  },

  async updateLesson(id: string, data: { title: string; description: string }): Promise<void> {
    await apiClient.put(`/api/lessons/${id}`, data);
  },

  async deleteLesson(id: string): Promise<void> {
    await apiClient.delete(`/api/lessons/${id}`);
  },

  // Upload media file for a lesson
  async uploadMedia(lessonId: string, file: File): Promise<MediaResponse> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<MediaResponse>(
      `/api/media/upload?lessonId=${lessonId}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },

  // Add external media link to a lesson
  async addExternalMedia(lessonId: string, externalUrl: string, type: 'VIDEO' | 'IMAGE' | 'OTHER'): Promise<MediaResponse> {
    const response = await apiClient.post<MediaResponse>(
      `/api/media/external?lessonId=${lessonId}`,
      { externalUrl, type }
    );
    return response.data;
  },

  async deleteMedia(mediaId: string): Promise<void> {
    await apiClient.delete(`/api/media/${mediaId}`);
  },
};