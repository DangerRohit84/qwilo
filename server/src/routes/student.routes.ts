import { Router, Response } from "express";
import { authenticate, authorize, AuthRequest } from "../middleware/auth";
import { upload } from "../middleware/upload";
import * as homeworkService from "../services/homework.service";
import * as questionService from "../services/question.service";
import * as notificationService from "../services/notification.service";
import { uploadFromBuffer } from "../utils/cloudinary";
import prisma from "../utils/prisma";

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
      const result = await homeworkService.processHomework(req.params.id as string);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

router.get("/tasks", async (req: AuthRequest, res: Response) => {
  try {
    const tasks = await homeworkService.getStudentTasks(req.user!.id);
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
        questions: true,
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

      const questions = await questionService.generateAndSaveQuestions(taskId);

      res.json({ submission, questionCount: questions.length });
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
      const audioUrl = await uploadFromBuffer(
        req.file.buffer,
        `voice-answers/${req.user!.id}`
      );

      const result = await questionService.submitAnswer(
        questionId,
        req.user!.id,
        undefined,
        audioUrl
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
    const progress = await homeworkService.getStudentProgress(req.user!.id);
    res.json(progress);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
