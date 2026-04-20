
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
  media?: Media[];
  quizId?: string; // Reference to quiz if this lesson has one
}

export interface SubModule {
  id: string;
  name: string;
  moduleResponse?: string; // Module ID reference from API
  lessons: Lesson[];
  quizResponse?: Quiz | null; // Quiz for this sub-module if exists
}

export interface SystemModule {
  id: string;
  name: string;
  icon: string;
  description: string;
  subModules?: SubModule[];
  lessons: Lesson[]; // All lessons at module level
}

export interface Media {
  id: string;
  type: 'VIDEO' | 'IMAGE' | 'OTHER';
  url: string;
}

export interface Quiz {
  id: string;
  name: string;
  questions: Question[];
  subModuleId: string;
  timeLimitInMinutes?: number | null;
  passingScore?: number | null;
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
  avatar?: string;
  allowedModules?: string[]; // IDs of modules this user can access
}
