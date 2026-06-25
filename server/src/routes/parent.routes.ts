import { Router, Response } from "express";
import { authenticate, authorize, AuthRequest } from "../middleware/auth";
import prisma from "../utils/prisma";

const router = Router();

router.use(authenticate);
router.use(authorize("PARENT"));

router.get("/progress", async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
    const links = await prisma.studentParent.findMany({
      where: { parentId: req.user!.id },
      include: {
        student: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    const { getStudentProgress } = await import("../services/homework.service");
    const results = await Promise.all(
      links.map(async (l: { student: { id: string; name: string; email: string } }) => {
        const progress = await getStudentProgress(
          l.student.id,
          startDate ? new Date(startDate) : undefined,
          endDate ? new Date(endDate) : undefined,
          true
        );
        return { id: l.student.id, name: l.student.name, email: l.student.email, ...progress };
      })
    );

    const totalTasks = results.reduce((s: number, r: any) => s + (r.totalTasks || 0), 0);
    const completedTasks = results.reduce((s: number, r: any) => s + (r.completedTasks || 0), 0);
    const totalQuestions = results.reduce((s: number, r: any) => s + (r.totalQuestions || 0), 0);
    const correctAnswers = results.reduce((s: number, r: any) => s + (r.correctAnswers || 0), 0);
    const allSessions = results.flatMap((r: any) => r.recentSessions || []);

    res.json({
      children: results,
      aggregated: {
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        accuracy: totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0,
        completedTasks,
        totalTasks,
        correctAnswers,
        totalQuestions,
      },
      recentSessions: allSessions.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/children", async (req: AuthRequest, res: Response) => {
  try {
    const links = await prisma.studentParent.findMany({
      where: { parentId: req.user!.id },
      include: {
        student: {
          select: { id: true, name: true, email: true },
        },
      },
    });
    res.json(links.map((l: { student: { id: string; name: string; email: string } }) => l.student));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/children/:id/progress", async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
    const link = await prisma.studentParent.findFirst({
      where: { parentId: req.user!.id, studentId: req.params.id as string },
    });
    if (!link) return res.status(403).json({ error: "Not your child" });

    const { getStudentProgress } = await import("../services/homework.service");
    const progress = await getStudentProgress(
      req.params.id as string,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );
    res.json(progress);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/children/:id/sessions", async (req: AuthRequest, res: Response) => {
  try {
    const link = await prisma.studentParent.findFirst({
      where: { parentId: req.user!.id, studentId: req.params.id as string },
    });
    if (!link) return res.status(403).json({ error: "Not your child" });

    const sessions = await prisma.homeworkSession.findMany({
      where: { studentId: req.params.id as string },
      orderBy: { date: "desc" },
      include: {
        tasks: {
          select: { id: true, status: true, subject: true, type: true, description: true, orderIndex: true },
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    const allTaskIds = sessions.flatMap((s) => s.tasks.map((t) => t.id));
    const [questionCounts, correctAnswers] = await Promise.all([
      prisma.question.groupBy({ by: ["taskId"], where: { taskId: { in: allTaskIds } }, _count: true }),
      prisma.answer.findMany({
        where: { question: { taskId: { in: allTaskIds } }, isCorrect: true },
        select: { question: { select: { taskId: true } } },
      }),
    ]);

    const qCountMap: Record<string, number> = {};
    for (const qc of questionCounts) qCountMap[qc.taskId] = qc._count;

    const correctByTask: Record<string, number> = {};
    for (const a of correctAnswers) {
      const tid = a.question.taskId;
      correctByTask[tid] = (correctByTask[tid] || 0) + 1;
    }

    const result = sessions.map((s) => ({
      ...s,
      tasks: s.tasks.map((t: any) => ({
        ...t,
        questionCount: qCountMap[t.id] || 0,
        correctCount: correctByTask[t.id] || 0,
      })),
    }));

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/sessions/:id", async (req: AuthRequest, res: Response) => {
  try {
    const preSession = await prisma.homeworkSession.findUnique({
      where: { id: req.params.id as string },
      select: { studentId: true },
    });
    if (!preSession) return res.status(404).json({ error: "Session not found" });

    const link = await prisma.studentParent.findFirst({
      where: { parentId: req.user!.id, studentId: preSession.studentId },
    });
    if (!link) return res.status(403).json({ error: "Not your child" });

    const session = await prisma.homeworkSession.findUnique({
      where: { id: req.params.id as string },
      include: {
        student: { select: { id: true, name: true } },
        tasks: {
          include: { submission: true, questions: { include: { answers: { where: { studentId: preSession.studentId } } } } },
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    res.json(session);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
