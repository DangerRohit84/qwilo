import { Router, Response } from "express";
import { authenticate, authorize, AuthRequest } from "../middleware/auth";
import { upload } from "../middleware/upload";
import * as homeworkService from "../services/homework.service";
import * as questionService from "../services/question.service";
import * as notificationService from "../services/notification.service";
import * as groqService from "../services/groq.service";
import * as queueService from "../services/queue.service";
import { uploadFromBuffer } from "../utils/cloudinary";
import prisma from "../utils/prisma";
import fs from "fs";
import path from "path";
import os from "os";

const router = Router();

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
    const { startDate, endDate } = req.query as {
      startDate?: string;
      endDate?: string;
    };
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
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "At least one image required" });
      }
      const taskId = req.params.id as string;
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
      res.json(questions.map((q) => ({
        id: q.id,
        questionText: q.questionText,
        type: q.type,
        options: q.options,
        correctAnswer: q.correctAnswer,
        studentAnswer: q.answers[0]?.answerText || null,
        score: q.answers[0]?.score || null,
        isCorrect: q.answers[0]?.isCorrect ?? null,
      })));
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
      const question = await questionService.getNextQuestion(
        taskId,
        req.user!.id
      );
      if (!question) {
        return res.json({ done: true, message: "All questions answered!" });
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
      const { answerText } = req.body;
      const result = await questionService.submitAnswer(
        questionId,
        req.user!.id,
        answerText
      );

      const question = await prisma.question.findUnique({
        where: { id: questionId },
      });

      if (result.answer.isCorrect && question) {
        const task = await (await import("../utils/prisma")).default.task.findUnique({
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

      const ext = req.file.mimetype.split("/")[1] || "webm";
      const tmpFile = path.join(os.tmpdir(), `voice-${Date.now()}.${ext}`);
      fs.writeFileSync(tmpFile, req.file.buffer);

      const transcript = await groqService.transcribeAudio(tmpFile);

      fs.unlinkSync(tmpFile);

      const result = await questionService.submitAnswer(
        questionId,
        req.user!.id,
        transcript || undefined
      );

      const question = await prisma.question.findUnique({
        where: { id: questionId },
      });

      if (result.answer.isCorrect && question) {
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
