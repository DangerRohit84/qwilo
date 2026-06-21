import { Router, Response } from "express";
import { authenticate, authorize, AuthRequest } from "../middleware/auth";
import prisma from "../utils/prisma";

const router = Router();

router.use(authenticate);
router.use(authorize("PARENT"));

router.get("/progress", async (req: AuthRequest, res: Response) => {
  try {
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
        const progress = await getStudentProgress(l.student.id);
        return { id: l.student.id, name: l.student.name, email: l.student.email, ...progress };
      })
    );
    res.json(results);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
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
    res.status(400).json({ error: err.message });
  }
});

router.get("/children/:id/progress", async (req: AuthRequest, res: Response) => {
  try {
    const link = await prisma.studentParent.findFirst({
      where: { parentId: req.user!.id, studentId: req.params.id as string },
    });
    if (!link) return res.status(403).json({ error: "Not your child" });

    const { getStudentProgress } = await import("../services/homework.service");
    const progress = await getStudentProgress(req.params.id as string);
    res.json(progress);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
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
          include: { submission: true, questions: { include: { answers: true } } },
          orderBy: { orderIndex: "asc" },
        },
      },
    });
    res.json(sessions);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/sessions/:id", async (req: AuthRequest, res: Response) => {
  try {
    const session = await prisma.homeworkSession.findUnique({
      where: { id: req.params.id as string },
      include: {
        student: { select: { id: true, name: true } },
        tasks: {
          include: { submission: true, questions: { include: { answers: true } } },
          orderBy: { orderIndex: "asc" },
        },
      },
    });
    if (!session) return res.status(404).json({ error: "Session not found" });

    const link = await prisma.studentParent.findFirst({
      where: { parentId: req.user!.id, studentId: session.student.id },
    });
    if (!link) return res.status(403).json({ error: "Not your child" });

    res.json(session);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
