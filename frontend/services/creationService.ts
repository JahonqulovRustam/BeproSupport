import { moduleService } from './moduleService';
import { quizService } from './quizService';
import { SubModule, Lesson, Quiz, Question } from '../types';

// ─── Helper interfaces for creation ────────────────────────────────────────────

export interface CreateLessonParams {
  title: string;
  description: string;
  moduleId: number;
  subModuleId?: number;
  files?: File[];
  externalMedia?: Array<{
    externalUrl: string;
    type: 'VIDEO' | 'IMAGE' | 'OTHER';
  }>;
}

export interface CreateSubModuleParams {
  name: string;
  moduleId: number;
}

export interface CreateQuizParams {
  name: string;
  subModuleId: number;
}

export interface CreateQuestionParams {
  text: string;
  options: string[];
  correctAnswer: string;
  subModuleId: number;
}

// ─── Centralized creation service ──────────────────────────────────────────────
export const creationService = {
  /**
   * Create a complete lesson with optional media and external content
   *
   * @param params - Lesson creation parameters
   * @returns Created lesson object
   * @throws Error if creation fails
   *
   * @example
   * const lesson = await creationService.createLesson({
   *   title: 'Introduction to React',
   *   description: 'Learn React basics',
   *   moduleId: 1,
   *   subModuleId: 5,
   *   externalMedia: [
   *     { externalUrl: 'https://youtube.com/...', type: 'VIDEO' }
   *   ],
   *   files: [videoFile, documentFile]
   * });
   */
  async createLesson(params: CreateLessonParams): Promise<Lesson> {
    try {
      return await moduleService.createLesson(
        params.title,
        params.description,
        params.moduleId,
        params.subModuleId,
        params.files,
        params.externalMedia
      );
    } catch (error) {
      console.error('Failed to create lesson:', error);
      throw new Error(`Lesson creation failed: ${(error as Error).message}`);
    }
  },

  /**
   * Create a sub-module under a module
   *
   * @param params - SubModule creation parameters
   * @returns Created sub-module object
   * @throws Error if creation fails
   *
   * @example
   * const subModule = await creationService.createSubModule({
   *   name: 'React Hooks',
   *   moduleId: 1
   * });
   */
  async createSubModule(params: CreateSubModuleParams): Promise<SubModule> {
    try {
      return await moduleService.createSubModule(params.name, params.moduleId);
    } catch (error) {
      console.error('Failed to create sub-module:', error);
      throw new Error(
        `Sub-module creation failed: ${(error as Error).message}`
      );
    }
  },

  /**
   * Create a quiz for a sub-module
   *
   * @param params - Quiz creation parameters
   * @returns Created quiz object
   * @throws Error if creation fails
   *
   * @example
   * const quiz = await creationService.createQuiz({
   *   name: 'React Basics Quiz',
   *   subModuleId: 5
   * });
   */
  async createQuiz(params: CreateQuizParams): Promise<Quiz> {
    try {
      return await quizService.createQuiz(params.name, params.subModuleId);
    } catch (error) {
      console.error('Failed to create quiz:', error);
      throw new Error(`Quiz creation failed: ${(error as Error).message}`);
    }
  },

  /**
   * Create a question for a quiz
   *
   * @param params - Question creation parameters
   * @returns Created question object
   * @throws Error if creation fails
   *
   * @example
   * const question = await creationService.createQuestion({
   *   text: 'What is React?',
   *   options: ['A library', 'A framework', 'A tool', 'A language'],
   *   correctAnswer: 'A library',
   *   subModuleId: 5
   * });
   */
  async createQuestion(params: CreateQuestionParams): Promise<Question> {
    try {
      return await quizService.createQuestion(
        params.text,
        params.options,
        params.correctAnswer,
        params.subModuleId
      );
    } catch (error) {
      console.error('Failed to create question:', error);
      throw new Error(
        `Question creation failed: ${(error as Error).message}`
      );
    }
  },

  /**
   * Create a complete lesson workflow with sub-module creation if needed
   *
   * @param lesson - Lesson parameters
   * @param createSubModule - Whether to create the sub-module if it doesn't exist
   * @returns Created lesson with all associated data
   *
   * @example
   * const lesson = await creationService.createLessonWorkflow(
   *   {
   *     title: 'Advanced React',
   *     description: 'Deep dive into React',
   *     moduleId: 1,
   *     externalMedia: [{ externalUrl: '...', type: 'VIDEO' }]
   *   },
   *   false // Don't create sub-module
   * );
   */
  async createLessonWorkflow(
    lesson: CreateLessonParams,
    createSubModule = false
  ): Promise<Lesson> {
    try {
      // Create sub-module if needed and not provided
      let subModuleId = lesson.subModuleId;
      if (createSubModule && !subModuleId) {
        const subModule = await moduleService.createSubModule(
          `SubModule of Module ${lesson.moduleId}`,
          lesson.moduleId
        );
        subModuleId = parseInt(subModule.id);
      }

      return await this.createLesson({
        ...lesson,
        subModuleId,
      });
    } catch (error) {
      console.error('Failed to create lesson workflow:', error);
      throw new Error(
        `Lesson workflow failed: ${(error as Error).message}`
      );
    }
  },

  /**
   * Create a complete quiz workflow with questions
   *
   * @param quiz - Quiz creation parameters
   * @param questions - Array of question parameters to add to the quiz
   * @returns Created quiz with all questions
   *
   * @example
   * const quiz = await creationService.createQuizWorkflow(
   *   { name: 'Module Quiz', subModuleId: 5 },
   *   [
   *     {
   *       text: 'Question 1?',
   *       options: ['A', 'B', 'C'],
   *       correctAnswer: 'A',
   *       subModuleId: 5
   *     }
   *   ]
   * );
   */
  async createQuizWorkflow(
    quiz: CreateQuizParams,
    questions: CreateQuestionParams[]
  ): Promise<Quiz> {
    try {
      const createdQuiz = await this.createQuiz(quiz);

      // Add questions to quiz
      const createdQuestions = await Promise.all(
        questions.map((q) => this.createQuestion(q))
      );

      return {
        ...createdQuiz,
        questions: createdQuestions,
      };
    } catch (error) {
      console.error('Failed to create quiz workflow:', error);
      throw new Error(
        `Quiz workflow failed: ${(error as Error).message}`
      );
    }
  },

  /**
   * Upload media to a lesson
   *
   * @param lessonId - ID of the lesson
   * @param file - File to upload
   * @returns Media object with upload details
   *
   * @example
   * const media = await creationService.uploadLessonMedia('123', videoFile);
   */
  async uploadLessonMedia(lessonId: string, file: File) {
    try {
      return await moduleService.uploadMedia(lessonId, file);
    } catch (error) {
      console.error('Failed to upload media:', error);
      throw new Error(`Media upload failed: ${(error as Error).message}`);
    }
  },

  /**
   * Add external media link to a lesson
   *
   * @param lessonId - ID of the lesson
   * @param externalUrl - URL of external media
   * @param type - Type of media (VIDEO, IMAGE, OTHER)
   * @returns Media object
   *
   * @example
   * const media = await creationService.addExternalLessonMedia(
   *   '123',
   *   'https://youtube.com/watch?v=xxx',
   *   'VIDEO'
   * );
   */
  async addExternalLessonMedia(
    lessonId: string,
    externalUrl: string,
    type: 'VIDEO' | 'IMAGE' | 'OTHER'
  ) {
    try {
      return await moduleService.addExternalMedia(lessonId, externalUrl, type);
    } catch (error) {
      console.error('Failed to add external media:', error);
      throw new Error(
        `External media addition failed: ${(error as Error).message}`
      );
    }
  },
};
