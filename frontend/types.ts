
export type UserRole = 'ADMIN' | 'EMPLOYEE' | 'LEAD';

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
}

export interface Lesson {
  id: string;
  title: string;
  videoUrl: string;
  description: string;
  questions: Question[];
  media: Media[];
}

export interface SubModule {
  id: string;
  name: string;
  lessons: Lesson[];
}

export interface SystemModule {
  id: string;
  name: string;
  icon: string;
  description: string;
  subModules?: SubModule[];
  lessons?: Lesson[]; // legacy support
}

export interface Media {
  id: string;
  type: 'VIDEO' | 'IMAGE' | 'OTHER';
  url: string;
}

export interface UserProgress {
  userId: string;
  moduleScores: Record<string, number>; // moduleId -> percentage
  completedLessons: string[]; // array of lessonIds
}

export interface User {
  id: string;
  name: string;
  login: string;
  password?: string;
  role: UserRole;
  avatar: string;
  allowedModules?: string[]; // IDs of modules this user can access
}
