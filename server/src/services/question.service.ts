import prisma from "../utils/prisma";
import * as groqService from "./groq.service";

const recentStyles = new Map<string, string[]>();

export async function generateAndSaveQuestions(taskId: string) {
  const existing = await prisma.question.findMany({ where: { taskId } });
  if (existing.length > 0) return existing;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { submission: true, session: true },
  });
  if (!task || !task.submission) throw new Error("Task or submission not found");

  const questions = await groqService.generateQuestions(
    task.type,
    task.description,
    task.subject || "General",
    task.submission.aiAnalysis || ""
  );

  const saved: any[] = [];
  for (const q of questions) {
    const savedQ = await prisma.question.create({
      data: {
        taskId,
        questionText: q.questionText,
        type: q.type,
        options: q.options || undefined,
        correctAnswer: q.correctAnswer,
      },
    });
    saved.push(savedQ);
  }

  return saved;
}

export async function getNextQuestion(taskId: string, studentId: string) {
  const questions = await prisma.question.findMany({
    where: { taskId },
    include: { answers: { where: { studentId } } },
    orderBy: { createdAt: "asc" },
  });

  const unanswered = questions.filter(
    (q) => !q.answers || q.answers.length === 0
  );

  if (unanswered.length === 0) return null;

  const key = `${taskId}-${studentId}`;
  if (!recentStyles.has(key)) recentStyles.set(key, []);

  const used = recentStyles.get(key)!;

  const available =
    used.length === 0
      ? unanswered
      : unanswered.filter((q) => q.type !== used[used.length - 1]);

  const pool = available.length > 0 ? available : unanswered;

  const shuffled = pool.sort(() => Math.random() - 0.5);
  const selected = shuffled[0];

  used.push(selected.type);
  if (used.length > 3) used.shift();

  return {
    id: selected.id,
    questionText: selected.questionText,
    type: selected.type,
    options: selected.type === "MCQ" ? shuffleArray(selected.options as string[] || []) : undefined,
  };
}

export async function submitAnswer(
  questionId: string,
  studentId: string,
  answerText?: string,
  answerAudioUrl?: string
) {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
  });
  if (!question) throw new Error("Question not found");

  let isCorrect = false;
  let score = 0;
  let explanation: string | undefined;

  if (question.type === "MCQ") {
    isCorrect = answerText?.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
    score = isCorrect ? 100 : 0;
    if (!isCorrect) {
      try {
        const res = await groqService.explainCorrectAnswer(
          question.questionText,
          question.correctAnswer,
          answerText || ""
        );
        explanation = res.explanation;
      } catch {
        explanation = `The correct answer is: ${question.correctAnswer}`;
      }
    }
  } else {
    const result = await groqService.evaluateVoiceAnswer(
      question.questionText,
      question.correctAnswer,
      answerText || ""
    );
    isCorrect = result.isCorrect;
    score = result.score;
    explanation = result.feedback;
  }

  const answer = await prisma.answer.create({
    data: {
      questionId,
      studentId,
      answerText,
      answerAudio: answerAudioUrl,
      isCorrect,
      score,
      feedback: explanation,
    },
  });

  const questionCount = await prisma.question.count({
    where: { taskId: question.taskId },
  });
  const answerCount = await prisma.answer.count({
    where: {
      questionId: { in: (await prisma.question.findMany({ where: { taskId: question.taskId }, select: { id: true } })).map(q => q.id) },
      studentId,
    },
  });

  if (answerCount >= questionCount) {
    await prisma.task.update({
      where: { id: question.taskId },
      data: { status: "COMPLETED" },
    });
  }

  return { answer, isCorrect, score, correctAnswer: question.correctAnswer, explanation };
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
