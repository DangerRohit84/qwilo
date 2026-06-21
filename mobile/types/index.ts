export interface User {
  id: string;
  email: string;
  name: string;
  role: "STUDENT" | "PARENT" | "TEACHER";
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface HomeworkSession {
  id: string;
  studentId: string;
  date: string;
  homeworkImageUrl: string;
  rawOcrText?: string;
  status: string;
  tasks: Task[];
}

export interface Task {
  id: string;
  sessionId: string;
  type: string;
  subject?: string;
  description: string;
  status: string;
  orderIndex: number;
  sessionDate?: string;
  sessionStatus?: string;
  submission?: Submission;
  questions?: Question[];
}

export interface Submission {
  id: string;
  taskId: string;
  images: string[];
  aiAnalysis?: string;
  submittedAt: string;
}

export interface Question {
  id: string;
  questionText: string;
  type: "MCQ" | "VOICE";
  options?: string[];
  correctAnswer: string;
}

export interface AnswerResult {
  answer: {
    id: string;
    isCorrect: boolean;
    score: number;
  };
  isCorrect: boolean;
  score: number;
  correctAnswer: string;
  explanation?: string;
}

export interface StudentProgress {
  totalSessions: number;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  subjectBreakdown: Record<string, { total: number; completed: number }>;
  recentSessions: {
    id: string;
    date: string;
    status: string;
    taskCount: number;
  }[];
}

export interface TaskListResponse {
  pending: Task[];
  completed: Task[];
}
