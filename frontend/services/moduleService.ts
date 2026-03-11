
import apiClient from './apiClient';
import { SystemModule, Lesson, Question, Media } from '../types';

interface BackendMedia {
    id: number;
    type: 'VIDEO' | 'IMAGE' | 'OTHER';
    url: string;
}

interface BackendQuestion {
    id: number;
    text: string;
    options: string[];
    correctAns: string;
}

interface BackendLesson {
    id: number;
    title: string;
    description: string;
    questions: BackendQuestion[];
    media: BackendMedia[];
}

interface BackendModule {
    id: number;
    title: string;
    description: string;
    lessons: BackendLesson[];
}

const mapMedia = (m: BackendMedia): Media => ({
    id: m.id.toString(),
    type: m.type,
    url: m.url,
});

const mapQuestion = (q: BackendQuestion): Question => ({
    id: q.id.toString(),
    text: q.text,
    options: q.options,
    correctAnswer: q.options.indexOf(q.correctAns),
});



const mapLesson = (l: BackendLesson): Lesson => ({
    id: l.id.toString(),
    title: l.title,
    description: l.description,
    videoUrl: l.media?.find(m => m.type === 'VIDEO')?.url || '',
    questions: l.questions.map(mapQuestion),
    media: l.media.map(mapMedia),
});

const mapModule = (m: BackendModule): SystemModule => ({
    id: m.id.toString(),
    name: m.title,
    description: m.description,
    icon: 'fa-server', // Default icon, can be improved
    lessons: m.lessons.map(mapLesson),
});

export const moduleService = {
    async getAllModules(): Promise<SystemModule[]> {
        const response = await apiClient.get<BackendModule[]>('/modules');
        return response.data.map(mapModule);
    },

    async getModuleById(id: string): Promise<SystemModule> {
        const response = await apiClient.get<BackendModule>(`/modules/${id}`);
        return mapModule(response.data);
    },

    async createModule(module: { title: string; description: string }): Promise<SystemModule> {
        const response = await apiClient.post<BackendModule>('/modules', module);
        return mapModule(response.data);
    },

    async deleteModule(id: string): Promise<void> {
        await apiClient.delete(`/modules/${id}`);
    },

    async getAllLessons(): Promise<Lesson[]> {
        const response = await apiClient.get<BackendLesson[]>('/lessons');
        return response.data.map(mapLesson);
    },

    async createLesson(lessonData: any, files: File[]): Promise<Lesson> {
        const formData = new FormData();
        // Backend expects 'lesson' part as JSON
        formData.append('lesson', new Blob([JSON.stringify(lessonData)], { type: 'application/json' }));

        // Backend expects 'file' part as multiple files
        files.forEach(file => {
            formData.append('file', file);
        });

        const response = await apiClient.post<BackendLesson>('/lessons', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return mapLesson(response.data);
    },

    async deleteLesson(id: string): Promise<void> {
        await apiClient.delete(`/lessons/${id}`);
    },
};
