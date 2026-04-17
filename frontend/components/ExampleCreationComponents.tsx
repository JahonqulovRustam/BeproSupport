import React, { useState } from 'react';
import { creationService } from '../services/creationService';
import { Lesson, SubModule, Quiz } from '../types';

/**
 * Example component for creating lessons
 * Demonstrates the full lesson creation workflow with optional media
 */
export const CreateLessonExample: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [moduleId, setModuleId] = useState<number>(1);
  const [subModuleId, setSubModuleId] = useState<number | undefined>();
  const [externalUrl, setExternalUrl] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const externalMedia = externalUrl
        ? [
            {
              externalUrl,
              type: 'VIDEO' as const,
            },
          ]
        : undefined;

      const lesson = await creationService.createLesson({
        title,
        description,
        moduleId,
        subModuleId,
        files: selectedFiles.length > 0 ? selectedFiles : undefined,
        externalMedia,
      });

      console.log('Lesson created:', lesson);
      setSuccess(true);

      // Reset form
      setTitle('');
      setDescription('');
      setExternalUrl('');
      setSelectedFiles([]);
    } catch (err) {
      setError((err as Error).message);
      console.error('Failed to create lesson:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-lesson-form">
      <h2>Create New Lesson</h2>

      {error && <div className="alert alert-error">{error}</div>}
      {success && (
        <div className="alert alert-success">Lesson created successfully!</div>
      )}

      <form onSubmit={handleCreateLesson}>
        <div className="form-group">
          <label>Title:</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label>Description:</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label>Module ID:</label>
          <input
            type="number"
            value={moduleId}
            onChange={(e) => setModuleId(parseInt(e.target.value))}
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label>Sub-Module ID (optional):</label>
          <input
            type="number"
            value={subModuleId || ''}
            onChange={(e) =>
              setSubModuleId(e.target.value ? parseInt(e.target.value) : undefined)
            }
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label>External Media URL:</label>
          <input
            type="url"
            value={externalUrl}
            onChange={(e) => setExternalUrl(e.target.value)}
            placeholder="https://youtube.com/..."
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label>Upload Files:</label>
          <input
            type="file"
            multiple
            onChange={handleFileChange}
            disabled={loading}
          />
          {selectedFiles.length > 0 && (
            <ul>
              {selectedFiles.map((file, idx) => (
                <li key={idx}>{file.name}</li>
              ))}
            </ul>
          )}
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Lesson'}
        </button>
      </form>
    </div>
  );
};

/**
 * Example component for creating sub-modules
 */
export const CreateSubModuleExample: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [createdSubModule, setCreatedSubModule] = useState<SubModule | null>(
    null
  );

  const [name, setName] = useState('');
  const [moduleId, setModuleId] = useState<number>(1);

  const handleCreateSubModule = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const subModule = await creationService.createSubModule({
        name,
        moduleId,
      });

      console.log('Sub-module created:', subModule);
      setCreatedSubModule(subModule);
      setSuccess(true);
      setName('');
    } catch (err) {
      setError((err as Error).message);
      console.error('Failed to create sub-module:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-submodule-form">
      <h2>Create New Sub-Module</h2>

      {error && <div className="alert alert-error">{error}</div>}
      {success && (
        <div className="alert alert-success">
          Sub-module created successfully! ID: {createdSubModule?.id}
        </div>
      )}

      <form onSubmit={handleCreateSubModule}>
        <div className="form-group">
          <label>Name:</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label>Module ID:</label>
          <input
            type="number"
            value={moduleId}
            onChange={(e) => setModuleId(parseInt(e.target.value))}
            required
            disabled={loading}
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Sub-Module'}
        </button>
      </form>
    </div>
  );
};

/**
 * Example component for creating quizzes with questions
 */
export const CreateQuizExample: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [createdQuiz, setCreatedQuiz] = useState<Quiz | null>(null);

  // Quiz form state
  const [quizName, setQuizName] = useState('');
  const [subModuleId, setSubModuleId] = useState<number>(1);

  // Questions state
  const [questions, setQuestions] = useState<
    Array<{
      text: string;
      options: string[];
      correctAnswer: string;
    }>
  >([]);

  const [currentQuestion, setCurrentQuestion] = useState({
    text: '',
    options: ['', '', '', ''],
    correctAnswer: '',
  });

  const handleAddQuestion = () => {
    if (
      currentQuestion.text &&
      currentQuestion.options.every((o) => o) &&
      currentQuestion.correctAnswer
    ) {
      setQuestions([...questions, currentQuestion]);
      setCurrentQuestion({
        text: '',
        options: ['', '', '', ''],
        correctAnswer: '',
      });
    }
  };

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const quiz = await creationService.createQuizWorkflow(
        { name: quizName, subModuleId },
        questions.map((q) => ({
          ...q,
          subModuleId,
        }))
      );

      console.log('Quiz created:', quiz);
      setCreatedQuiz(quiz);
      setSuccess(true);
      setQuizName('');
      setQuestions([]);
    } catch (err) {
      setError((err as Error).message);
      console.error('Failed to create quiz:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-quiz-form">
      <h2>Create New Quiz</h2>

      {error && <div className="alert alert-error">{error}</div>}
      {success && (
        <div className="alert alert-success">
          Quiz created successfully! ID: {createdQuiz?.id}
        </div>
      )}

      <form onSubmit={handleCreateQuiz}>
        <div className="form-group">
          <label>Quiz Name:</label>
          <input
            type="text"
            value={quizName}
            onChange={(e) => setQuizName(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label>Sub-Module ID:</label>
          <input
            type="number"
            value={subModuleId}
            onChange={(e) => setSubModuleId(parseInt(e.target.value))}
            required
            disabled={loading}
          />
        </div>

        <div className="questions-section">
          <h3>Questions</h3>

          <div className="add-question">
            <input
              type="text"
              value={currentQuestion.text}
              onChange={(e) =>
                setCurrentQuestion({ ...currentQuestion, text: e.target.value })
              }
              placeholder="Question text"
            />

            {currentQuestion.options.map((option, idx) => (
              <input
                key={idx}
                type="text"
                value={option}
                onChange={(e) => {
                  const newOptions = [...currentQuestion.options];
                  newOptions[idx] = e.target.value;
                  setCurrentQuestion({
                    ...currentQuestion,
                    options: newOptions,
                  });
                }}
                placeholder={`Option ${idx + 1}`}
              />
            ))}

            <select
              value={currentQuestion.correctAnswer}
              onChange={(e) =>
                setCurrentQuestion({
                  ...currentQuestion,
                  correctAnswer: e.target.value,
                })
              }
            >
              <option value="">Select correct answer</option>
              {currentQuestion.options.map((option, idx) => (
                <option key={idx} value={option}>
                  {option}
                </option>
              ))}
            </select>

            <button type="button" onClick={handleAddQuestion}>
              Add Question
            </button>
          </div>

          {questions.length > 0 && (
            <div className="questions-list">
              <h4>Added Questions ({questions.length})</h4>
              {questions.map((q, idx) => (
                <div key={idx} className="question-item">
                  <p>{q.text}</p>
                  <p>Options: {q.options.join(', ')}</p>
                  <p>Correct: {q.correctAnswer}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <button type="submit" disabled={loading || questions.length === 0}>
          {loading ? 'Creating...' : `Create Quiz (${questions.length} questions)`}
        </button>
      </form>
    </div>
  );
};
