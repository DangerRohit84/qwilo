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

  const saved = await prisma.$transaction(
    questions
      .filter((q) => q.questionText && q.correctAnswer && q.type)
      .map((q) =>
        prisma.question.create({
          data: {
            taskId,
            questionText: q.questionText,
            type: q.type,
            options: q.options || undefined,
            correctAnswer: q.correctAnswer,
          },
        })
      )
  );

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

  if (questions.length === 0) return { ready: false } as any;
  if (unanswered.length === 0) return null;

  const key = `${taskId}-${studentId}`;
  if (!recentStyles.has(key)) recentStyles.set(key, []);

  const used = recentStyles.get(key)!;

  const available =
    used.length === 0
      ? unanswered
      : unanswered.filter((q) => q.type !== used[used.length - 1]);

  const pool = available.length > 0 ? available : unanswered;

  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const selected = shuffled[0];

  used.push(selected.type);
  if (used.length > 3) used.shift();

  const totalCount = questions.length;
  const answeredCount = totalCount - unanswered.length;

  return {
    id: selected.id,
    questionText: selected.questionText,
    type: selected.type,
    options: selected.type === "MCQ" ? shuffleArray(selected.options as string[] || []) : undefined,
    currentIndex: answeredCount + 1,
    totalCount,
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

  const answer = await prisma.answer.create({
    data: {
      questionId,
      studentId,
      answerText,
      answerAudio: answerAudioUrl,
      isCorrect: false,
      score: 0,
    },
  });

  const answerCount = await prisma.answer.count({
    where: { question: { taskId: question.taskId }, studentId },
  });
  const questionCount = await prisma.question.count({
    where: { taskId: question.taskId },
  });

  if (answerCount >= questionCount) {
    await prisma.task.update({
      where: { id: question.taskId },
      data: { status: "COMPLETED" },
    });
    recentStyles.delete(`${question.taskId}-${studentId}`);
    evaluateTaskAnswers(question.taskId, studentId).catch(() => {});
  }

  return { answer, isCorrect: false, score: 0, correctAnswer: question.correctAnswer, explanation: undefined };
}

async function evaluateTaskAnswers(taskId: string, studentId: string) {
  const questions = await prisma.question.findMany({ where: { taskId } });
  const answers = await prisma.answer.findMany({
    where: {
      questionId: { in: questions.map((q) => q.id) },
      studentId,
    },
  });

  for (const answer of answers) {
    const question = questions.find((q) => q.id === answer.questionId);
    if (!question) continue;

    try {
      if (question.type === "MCQ") {
        const isCorrect = answer.answerText?.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
        await prisma.answer.update({
          where: { id: answer.id },
          data: {
            isCorrect,
            score: isCorrect ? 100 : 0,
            feedback: isCorrect ? "Correct!" : `The correct answer is: ${question.correctAnswer}`,
          },
        });
      } else if (question.type === "TRUE_FALSE") {
        const isCorrect = answer.answerText?.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
        await prisma.answer.update({
          where: { id: answer.id },
          data: {
            isCorrect,
            score: isCorrect ? 100 : 0,
            feedback: isCorrect ? "Correct!" : `The correct answer is: ${question.correctAnswer}`,
          },
        });
      } else if (question.type === "FILL_BLANK") {
        const studentVal = (answer.answerText || "").trim().toLowerCase();
        const correctVal = question.correctAnswer.trim().toLowerCase();
        const isCorrect = studentVal === correctVal;
        await prisma.answer.update({
          where: { id: answer.id },
          data: {
            isCorrect,
            score: isCorrect ? 100 : 0,
            feedback: isCorrect ? "Correct!" : `The correct answer is: ${question.correctAnswer}`,
          },
        });
      } else if (question.type === "ONE_WORD") {
        const studentVal = (answer.answerText || "").trim().toLowerCase();
        const correctVal = question.correctAnswer.trim().toLowerCase();
        const isCorrect = studentVal === correctVal;
        await prisma.answer.update({
          where: { id: answer.id },
          data: {
            isCorrect,
            score: isCorrect ? 100 : 0,
            feedback: isCorrect ? "Correct!" : `The correct answer is: ${question.correctAnswer}`,
          },
        });
      } else if (question.type === "SHORT_ANSWER" && answer.answerText) {
        const result = await groqService.evaluateShortAnswer(
          question.questionText,
          question.correctAnswer,
          answer.answerText
        );
        await prisma.answer.update({
          where: { id: answer.id },
          data: {
            isCorrect: result.isCorrect,
            score: result.score,
            feedback: result.feedback,
          },
        });
      } else if (question.type === "VOICE" && answer.answerText) {
        const result = await groqService.evaluateVoiceAnswer(
          question.questionText,
          question.correctAnswer,
          answer.answerText
        );
        await prisma.answer.update({
          where: { id: answer.id },
          data: {
            isCorrect: result.isCorrect,
            score: result.score,
            feedback: result.feedback,
          },
        });
      }
    } catch {}
  }
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
