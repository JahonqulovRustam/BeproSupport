# Creation Services Documentation

This document describes the services for creating lessons, quizzes, and sub-modules in the BeproSupport frontend application.

## Overview

The creation services are built on top of the OpenAPI specifications and provide a type-safe, error-handling layer for interacting with the backend API. They are organized as follows:

- **`quizService`** - Quiz and question creation/management
- **`moduleService`** - Module, sub-module, lesson, and media management
- **`creationService`** - High-level centralized API with workflows

## Quick Start

### Import the service

```typescript
import { creationService } from '../services/creationService';
```

### Create a lesson

```typescript
const lesson = await creationService.createLesson({
  title: 'Introduction to React',
  description: 'Learn the basics of React',
  moduleId: 1,
  subModuleId: 5,
  externalMedia: [
    {
      externalUrl: 'https://youtube.com/watch?v=example',
      type: 'VIDEO',
    },
  ],
  files: [videoFile, documentFile], // Optional
});
```

### Create a sub-module

```typescript
const subModule = await creationService.createSubModule({
  name: 'React Hooks',
  moduleId: 1,
});
```

### Create a quiz

```typescript
const quiz = await creationService.createQuiz({
  name: 'React Basics Quiz',
  subModuleId: 5,
});
```

### Create a question

```typescript
const question = await creationService.createQuestion({
  text: 'What is React?',
  options: ['A library', 'A framework', 'A tool', 'A language'],
  correctAnswer: 'A library',
  subModuleId: 5,
});
```

## Detailed API Reference

### `creationService`

#### `createLesson(params: CreateLessonParams): Promise<Lesson>`

Creates a new lesson with optional media and external content.

**Parameters:**
- `title` (string, required) - Lesson title
- `description` (string, required) - Lesson description
- `moduleId` (number, required) - Parent module ID
- `subModuleId` (number, optional) - Parent sub-module ID
- `files` (File[], optional) - Files to upload (videos, documents, etc.)
- `externalMedia` (Array, optional) - External media links
  - `externalUrl` (string) - URL of external media
  - `type` ('VIDEO' | 'IMAGE' | 'OTHER') - Type of media

**Returns:** Created `Lesson` object

**Example:**
```typescript
try {
  const lesson = await creationService.createLesson({
    title: 'Advanced React Patterns',
    description: 'Deep dive into React patterns and best practices',
    moduleId: 2,
    subModuleId: 10,
    externalMedia: [
      {
        externalUrl: 'https://youtube.com/watch?v=...',
        type: 'VIDEO',
      },
      {
        externalUrl: 'https://example.com/slides.pdf',
        type: 'OTHER',
      },
    ],
    files: [fileFromInput],
  });
} catch (error) {
  console.error('Failed to create lesson:', error);
}
```

#### `createSubModule(params: CreateSubModuleParams): Promise<SubModule>`

Creates a new sub-module under a module.

**Parameters:**
- `name` (string, required) - Sub-module name
- `moduleId` (number, required) - Parent module ID

**Returns:** Created `SubModule` object

**Example:**
```typescript
const subModule = await creationService.createSubModule({
  name: 'React Hooks Deep Dive',
  moduleId: 1,
});

console.log(subModule.id); // Use the ID for creating lessons
```

#### `createQuiz(params: CreateQuizParams): Promise<Quiz>`

Creates a new quiz for a sub-module.

**Parameters:**
- `name` (string, required) - Quiz name
- `subModuleId` (number, required) - Sub-module ID

**Returns:** Created `Quiz` object

**Example:**
```typescript
const quiz = await creationService.createQuiz({
  name: 'Module Assessment',
  subModuleId: 5,
});
```

#### `createQuestion(params: CreateQuestionParams): Promise<Question>`

Creates a question for a quiz.

**Parameters:**
- `text` (string, required) - Question text
- `options` (string[], required) - Array of answer options
- `correctAnswer` (string, required) - The correct answer (must be one of options)
- `subModuleId` (number, required) - Sub-module ID

**Returns:** Created `Question` object

**Example:**
```typescript
const question = await creationService.createQuestion({
  text: 'What hook is used for side effects?',
  options: ['useState', 'useEffect', 'useContext', 'useReducer'],
  correctAnswer: 'useEffect',
  subModuleId: 5,
});
```

#### `createLessonWorkflow(lesson: CreateLessonParams, createSubModule?: boolean): Promise<Lesson>`

Creates a lesson with automatic sub-module creation if needed.

**Parameters:**
- `lesson` - Lesson creation parameters
- `createSubModule` (boolean, optional) - If true and `subModuleId` not provided, creates a new sub-module

**Returns:** Created `Lesson` object

**Example:**
```typescript
const lesson = await creationService.createLessonWorkflow(
  {
    title: 'My Lesson',
    description: 'Description',
    moduleId: 1,
    // No subModuleId provided
  },
  true // Auto-create sub-module
);
```

#### `createQuizWorkflow(quiz: CreateQuizParams, questions: CreateQuestionParams[]): Promise<Quiz>`

Creates a quiz with all questions in one workflow.

**Parameters:**
- `quiz` - Quiz creation parameters
- `questions` - Array of question parameters to add

**Returns:** Created `Quiz` with all questions

**Example:**
```typescript
const quiz = await creationService.createQuizWorkflow(
  { name: 'Basic Quiz', subModuleId: 5 },
  [
    {
      text: 'Question 1?',
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 'A',
      subModuleId: 5,
    },
    {
      text: 'Question 2?',
      options: ['X', 'Y', 'Z', 'W'],
      correctAnswer: 'Z',
      subModuleId: 5,
    },
  ]
);
```

#### `uploadLessonMedia(lessonId: string, file: File): Promise<Media>`

Uploads a media file to a lesson.

**Parameters:**
- `lessonId` (string, required) - Lesson ID
- `file` (File, required) - File to upload

**Returns:** Created `Media` object

**Example:**
```typescript
const media = await creationService.uploadLessonMedia('123', videoFile);
```

#### `addExternalLessonMedia(lessonId: string, externalUrl: string, type: 'VIDEO' | 'IMAGE' | 'OTHER'): Promise<Media>`

Adds an external media link to a lesson.

**Parameters:**
- `lessonId` (string, required) - Lesson ID
- `externalUrl` (string, required) - URL of external media
- `type` ('VIDEO' | 'IMAGE' | 'OTHER', required) - Type of media

**Returns:** Created `Media` object

**Example:**
```typescript
const media = await creationService.addExternalLessonMedia(
  '123',
  'https://youtube.com/watch?v=...',
  'VIDEO'
);
```

### `moduleService`

Low-level service for module, sub-module, lesson, and media operations.

#### Sub-Module Operations

```typescript
// Get all sub-modules
const subModules = await moduleService.getAllSubModules();

// Create sub-module
const subModule = await moduleService.createSubModule(name, moduleId);

// Update sub-module
const updated = await moduleService.updateSubModule(id, { name, systemModuleId });

// Delete sub-module
await moduleService.deleteSubModule(id);
```

#### Lesson Operations

```typescript
// Get all lessons
const lessons = await moduleService.getAllLessons(moduleId);

// Get lessons by module
const moduleLessons = await moduleService.getLessonsByModule(moduleId);

// Create lesson
const lesson = await moduleService.createLesson(
  title,
  description,
  moduleId,
  subModuleId,
  files,
  externalMedia
);

// Update lesson
const updated = await moduleService.updateLesson(id, { title, description });

// Delete lesson
await moduleService.deleteLesson(id);
```

#### Media Operations

```typescript
// Get media by lesson
const media = await moduleService.getMediaByLesson(lessonId);

// Stream media
const blob = await moduleService.streamMedia(mediaId);

// Upload media
const media = await moduleService.uploadMedia(lessonId, file);

// Add external media
const media = await moduleService.addExternalMedia(lessonId, url, type);

// Delete media
await moduleService.deleteMedia(mediaId);
```

### `quizService`

Low-level service for quiz and question operations.

```typescript
// Create quiz
const quiz = await quizService.createQuiz(name, subModuleId);

// Get quiz by ID
const quiz = await quizService.getQuizById(id);

// Create question
const question = await quizService.createQuestion(text, options, correctAnswer, subModuleId);

// Get all questions
const questions = await quizService.getAllQuestions();

// Update question
const updated = await quizService.updateQuestion(id, text, options, correctAnswer, subModuleId);

// Delete question
await quizService.deleteQuestion(id);
```

## Error Handling

All services include error handling. Errors are logged to console and thrown as `Error` objects with descriptive messages.

```typescript
try {
  const lesson = await creationService.createLesson({
    title: 'My Lesson',
    description: 'Description',
    moduleId: 1,
  });
} catch (error) {
  console.error('Failed:', error.message);
  // Handle error - show user message, retry, etc.
}
```

## TypeScript Types

### CreateLessonParams
```typescript
interface CreateLessonParams {
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
```

### CreateSubModuleParams
```typescript
interface CreateSubModuleParams {
  name: string;
  moduleId: number;
}
```

### CreateQuizParams
```typescript
interface CreateQuizParams {
  name: string;
  subModuleId: number;
}
```

### CreateQuestionParams
```typescript
interface CreateQuestionParams {
  text: string;
  options: string[];
  correctAnswer: string;
  subModuleId: number;
}
```

## Response Types

All services return typed objects from the OpenAPI specification:

- **Lesson** - Lesson data with media and questions
- **SubModule** - Sub-module with associated lessons
- **Quiz** - Quiz with questions
- **Question** - Single question with options and correct answer
- **Media** - Media metadata (id, type, url)

See [types.ts](../types.ts) for complete type definitions.

## Authentication

All requests automatically include the JWT token from `localStorage.bepro_jwt` via the API client interceptor.

## Usage Examples

### Complete Lesson Creation Flow

```typescript
// 1. Create a sub-module
const subModule = await creationService.createSubModule({
  name: 'Advanced Topics',
  moduleId: 1,
});

// 2. Create a lesson
const lesson = await creationService.createLesson({
  title: 'Advanced Concepts',
  description: 'Learn advanced topics',
  moduleId: 1,
  subModuleId: parseInt(subModule.id),
  externalMedia: [
    {
      externalUrl: 'https://youtube.com/watch?v=example',
      type: 'VIDEO',
    },
  ],
});

// 3. Upload media
const media = await creationService.uploadLessonMedia(lesson.id, videoFile);

// 4. Create a quiz
const quiz = await creationService.createQuizWorkflow(
  { name: 'Lesson Quiz', subModuleId: parseInt(subModule.id) },
  [
    {
      text: 'What is the main topic?',
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 'A',
      subModuleId: parseInt(subModule.id),
    },
  ]
);
```

### Error Handling Example

```typescript
try {
  const lesson = await creationService.createLesson({
    title: 'My Lesson',
    description: 'Description',
    moduleId: 1,
  });
  console.log('Success:', lesson);
} catch (error) {
  if (error instanceof Error) {
    if (error.message.includes('Lesson creation failed')) {
      // Handle lesson-specific error
    }
  }
  // Show error to user
}
```

## Architecture

```
API Client
   ↓
quizService ← moduleService
   ↓          ↓
   └─→ creationService (High-level API)
            ↓
        React Components
```

The `creationService` provides:
- High-level workflows combining multiple steps
- Consistent error handling
- Type safety
- User-friendly error messages

Lower-level services (`moduleService`, `quizService`) provide:
- Direct API access
- Fine-grained control
- Lower-level error details

## Testing

Example test structure for using the services:

```typescript
describe('creationService', () => {
  it('should create a lesson with external media', async () => {
    const lesson = await creationService.createLesson({
      title: 'Test Lesson',
      description: 'Test Description',
      moduleId: 1,
      externalMedia: [
        {
          externalUrl: 'https://example.com/video.mp4',
          type: 'VIDEO',
        },
      ],
    });

    expect(lesson).toBeDefined();
    expect(lesson.title).toBe('Test Lesson');
  });
});
```

## Troubleshooting

### 401 Unauthorized
- Check that JWT token is valid in localStorage
- The API client automatically redirects to /login on 401

### 400 Bad Request
- Verify all required parameters are provided
- Check that parameter types match (e.g., moduleId should be number)

### 403 Forbidden
- User doesn't have permission for this operation
- Check user role and module access permissions

### Network Errors
- Verify backend API is running and accessible
- Check API_BASE_URL in services/config.ts
