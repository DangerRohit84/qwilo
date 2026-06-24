import { Router, Response } from "express";
import { authenticate, authorize, AuthRequest } from "../middleware/auth";
import { upload } from "../middleware/upload";
import * as homeworkService from "../services/homework.service";
import * as questionService from "../services/question.service";
import * as notificationService from "../services/notification.service";
import * as groqService from "../services/groq.service";
import * as queueService from "../services/queue.service";
import prisma from "../utils/prisma";
import fs from "fs";
import path from "path";
import os from "os";

const router = Router();

async function verifyTaskOwnership(taskId: string, studentId: string): Promise<boolean> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { session: { select: { studentId: true } } },
  });
  return task?.session.studentId === studentId;
}

async function verifyQuestionOwnership(questionId: string, studentId: string): Promise<boolean> {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: { task: { include: { session: { select: { studentId: true } } } } },
  });
  return question?.task.session.studentId === studentId;
}

router.use(authenticate);
router.use(authorize("STUDENT"));

router.post(
  "/homework",
  upload.single("image"),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Image file required" });
      }
      const session = await homeworkService.uploadHomeworkImage(
        req.user!.id,
        req.file.buffer,
        req.file.mimetype
      );
      res.status(201).json(session);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

router.post(
  "/homework/:id/process",
  async (req: AuthRequest, res: Response) => {
    try {
      const sessionId = req.params.id as string;
      const session = await prisma.homeworkSession.findUnique({
        where: { id: sessionId },
      });
      if (!session || session.studentId !== req.user!.id) {
        return res.status(404).json({ error: "Session not found" });
      }
      if (session.status !== "PENDING") {
        return res.status(400).json({ error: "Session already processing" });
      }
      await prisma.homeworkSession.update({
        where: { id: sessionId },
        data: { status: "PROCESSING" },
      });
      queueService.enqueue(async () => {
        try {
          await homeworkService.processHomework(sessionId);
        } catch (err: any) {
          console.error("Background processing failed:", err.message);
          await prisma.homeworkSession.update({
            where: { id: sessionId },
            data: { status: "FAILED" },
          });
        }
      });
      res.json({ message: "Processing started" });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

router.get(
  "/homework/:id/status",
  async (req: AuthRequest, res: Response) => {
    try {
      const session = await prisma.homeworkSession.findUnique({
        where: { id: req.params.id },
        include: { tasks: true },
      });
      if (!session) return res.status(404).json({ error: "Session not found" });
      if (session.studentId !== req.user!.id) return res.status(403).json({ error: "Forbidden" });
      res.json({
        status: session.status,
        taskCount: session.tasks.length,
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

router.get("/tasks", async (req: AuthRequest, res: Response) => {
  try {
    let { startDate, endDate } = req.query as {
      startDate?: string;
      endDate?: string;
    };
    if (!startDate && !endDate) {
      const now = new Date();
      startDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())).toISOString();
      endDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)).toISOString();
    }
    const tasks = await homeworkService.getStudentTasks(
      req.user!.id,
      startDate,
      endDate
    );
    res.json(tasks);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/tasks/:id", async (req: AuthRequest, res: Response) => {
  try {
    const taskId = req.params.id as string;
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        session: { select: { date: true, studentId: true } },
        submission: true,
        questions: {
          include: {
            answers: {
              where: { studentId: req.user!.id },
              take: 1,
            },
          },
        },
      },
    });
    if (!task || task.session.studentId !== req.user!.id) {
      return res.status(404).json({ error: "Task not found" });
    }
    res.json(task);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post(
  "/tasks/:id/submit",
  upload.array("images", 10),
  async (req: AuthRequest, res: Response) => {
    try {
      const files = req.files as { buffer: Buffer; mimetype: string }[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "At least one image required" });
      }
      const taskId = req.params.id as string;
      if (!(await verifyTaskOwnership(taskId, req.user!.id))) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const submission = await homeworkService.submitTaskWork(
        taskId,
        files.map((f) => ({ buffer: f.buffer, mimetype: f.mimetype }))
      );

      queueService.enqueue(async () => {
        try {
          await questionService.generateAndSaveQuestions(taskId);
        } catch (err: any) {
          console.error("Background question generation failed:", err.message);
        }
      });

      res.json({ submission, questionCount: "pending" });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

router.get(
  "/tasks/:id/review",
    async (req: AuthRequest, res: Response) => {
    try {
      const taskId = req.params.id as string;
      if (!(await verifyTaskOwnership(taskId, req.user!.id))) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const questions = await prisma.question.findMany({
        where: { taskId },
        include: {
          answers: {
            where: { studentId: req.user!.id },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { createdAt: "asc" },
      });

      const results: any[] = [];
      for (const q of questions) {
        const answer = q.answers[0];
        let isCorrect = answer?.isCorrect ?? null;
        let score = answer?.score ?? null;
        let feedback = answer?.feedback ?? null;

        if (answer && q.type === "MCQ" && score === 0 && !isCorrect) {
          const correct = answer.answerText?.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
          isCorrect = correct;
          score = correct ? 100 : 0;

          try {
            const result = await groqService.explainCorrectAnswer(
              q.questionText,
              q.correctAnswer,
              answer.answerText || ""
            );
            feedback = result.explanation;
          } catch {
            feedback = correct
              ? "Correct!"
              : `The correct answer is: ${q.correctAnswer}`;
          }

          await prisma.answer.update({
            where: { id: answer.id },
            data: { isCorrect: correct, score, feedback },
          });
        }

        results.push({
          id: q.id,
          questionText: q.questionText,
          type: q.type,
          options: q.options,
          correctAnswer: q.correctAnswer,
          studentAnswer: answer?.answerText || null,
          score,
          isCorrect,
          feedback,
        });
      }
      res.json(results);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

router.get(
  "/tasks/:id/questions/next",
    async (req: AuthRequest, res: Response) => {
    try {
      const taskId = req.params.id as string;
      if (!(await verifyTaskOwnership(taskId, req.user!.id))) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const question = await questionService.getNextQuestion(
        taskId,
        req.user!.id
      );
      if (!question) {
        return res.json({ done: true, message: "All questions answered!" });
      }
      if ((question as any).ready === false) {
        return res.json({ ready: false });
      }
      res.json(question);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

router.post(
  "/questions/:id/answer",
  async (req: AuthRequest, res: Response) => {
    try {
      const questionId = req.params.id as string;
      if (!(await verifyQuestionOwnership(questionId, req.user!.id))) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const { answerText } = req.body;
      const result = await questionService.submitAnswer(
        questionId,
        req.user!.id,
        answerText
      );

      const question = await prisma.question.findUnique({
        where: { id: questionId },
      });

      if (question) {
        const task = await prisma.task.findUnique({
          where: { id: question.taskId },
        });
        if (task && task.status === "COMPLETED") {
          await notificationService.notifyParentsOnTaskComplete(
            req.user!.id,
            question.taskId
          );
        }
      }

      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

router.post(
  "/questions/:id/answer-voice",
  upload.single("audio"),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Audio file required" });
      }

      const questionId = req.params.id as string;
      if (!(await verifyQuestionOwnership(questionId, req.user!.id))) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const ext = req.file.mimetype.split("/")[1] || "webm";
      const tmpFile = path.join(os.tmpdir(), `voice-${Date.now()}.${ext}`);
      fs.writeFileSync(tmpFile, req.file.buffer);

      let transcript = "";
      try {
        transcript = await groqService.transcribeAudio(tmpFile);
      } finally {
        try { fs.unlinkSync(tmpFile); } catch {}
      }

      const result = await questionService.submitAnswer(
        questionId,
        req.user!.id,
        transcript || undefined
      );

      const question = await prisma.question.findUnique({
        where: { id: questionId },
      });

      if (question) {
        const task = await prisma.task.findUnique({
          where: { id: question.taskId },
        });
        if (task && task.status === "COMPLETED") {
          await notificationService.notifyParentsOnTaskComplete(
            req.user!.id,
            question.taskId
          );
        }
      }

      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

router.get("/history", async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query as {
      startDate?: string;
      endDate?: string;
    };
    const progress = await homeworkService.getStudentProgress(
      req.user!.id,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );
    res.json(progress);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
