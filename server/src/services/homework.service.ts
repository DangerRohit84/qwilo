import prisma from "../utils/prisma";
import * as groqService from "./groq.service";
import { uploadFromBuffer } from "../utils/cloudinary";

export async function uploadHomeworkImage(
  studentId: string,
  buffer: Buffer,
  mimetype: string
) {
  const url = await uploadFromBuffer(buffer, `homework/${studentId}`);

  const session = await prisma.homeworkSession.create({
    data: {
      studentId,
      homeworkImageUrl: url,
      status: "PENDING",
    },
  });

  return session;
}

export async function processHomework(sessionId: string) {
  console.log(`[processHomework] Starting for session ${sessionId}`);
  const session = await prisma.homeworkSession.findUnique({
    where: { id: sessionId },
  });
  if (!session) throw new Error("Session not found");

  await prisma.homeworkSession.update({
    where: { id: sessionId },
    data: { status: "PROCESSING" },
  });

  console.log(`[processHomework] Running OCR for session ${sessionId}`);
  const ocrText = await groqService.ocrHomeworkImage(session.homeworkImageUrl);
  console.log(`[processHomework] OCR result length: ${ocrText.length}`);

  console.log(`[processHomework] Parsing tasks for session ${sessionId}`);
  const tasks = await groqService.parseTasksFromOcr(ocrText);
  console.log(`[processHomework] Parsed ${tasks.length} tasks`);

  if (!tasks || tasks.length === 0) {
    console.log(`[processHomework] No tasks found, creating fallback task for session ${sessionId}`);
    const fallbackTask = await prisma.task.create({
      data: {
        sessionId,
        type: "OTHER",
        subject: "General",
        description: ocrText.slice(0, 500) || "Homework task",
        orderIndex: 0,
      },
    });
    await prisma.homeworkSession.update({
      where: { id: sessionId },
      data: { rawOcrText: ocrText, status: "COMPLETED" },
    });
    return { sessionId, ocrText, tasks: [fallbackTask] };
  }

  console.log(`[processHomework] Creating ${tasks.length} tasks for session ${sessionId}`);
  const createdTasks = await prisma.$transaction(
    tasks.map((t, i) =>
      prisma.task.create({
        data: {
          sessionId,
          type: t.type || "OTHER",
          subject: t.subject || "General",
          description: t.description || "Homework task",
          orderIndex: i,
        },
      })
    )
  );

  await prisma.homeworkSession.update({
    where: { id: sessionId },
    data: { rawOcrText: ocrText, status: "COMPLETED" },
  });

  console.log(`[processHomework] Done! Created ${createdTasks.length} tasks for session ${sessionId}`);
  return { sessionId, ocrText, tasks: createdTasks };
}

export async function getStudentTasks(
  studentId: string,
  startDate?: string,
  endDate?: string
) {
  const dateFilter: any = {};
  if (startDate || endDate) {
    dateFilter.date = {};
    if (startDate) dateFilter.date.gte = startDate;
    if (endDate) dateFilter.date.lte = endDate;
  }

  const sessions = await prisma.homeworkSession.findMany({
    where: { studentId, ...(Object.keys(dateFilter).length ? dateFilter : {}) },
    orderBy: { date: "desc" },
    include: {
      tasks: {
        orderBy: { orderIndex: "asc" },
      },
    },
  });

  const allTasks = sessions.flatMap((s) =>
    s.tasks.map((t) => ({
      ...t,
      sessionDate: s.date,
      sessionStatus: s.status,
    }))
  );

  const pending = allTasks.filter((t) => t.status === "PENDING" || t.status === "SUBMITTED");
  const completed = allTasks.filter((t) => t.status === "COMPLETED");

  return { pending, completed };
}

export async function submitTaskWork(
  taskId: string,
  buffers: { buffer: Buffer; mimetype: string }[]
) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { session: true, submission: true },
  });
  if (!task) throw new Error("Task not found");

  if (task.submission) {
    return task.submission;
  }

  const urls: string[] = [];
  for (const buf of buffers) {
    const url = await uploadFromBuffer(
      buf.buffer,
      `submissions/${task.session.studentId}/${taskId}`
    );
    urls.push(url);
  }

  const analysis = await groqService.analyzeSubmittedWork(
    urls,
    task.type,
    task.description
  ).catch(() => "Analysis pending");

  const submission = await prisma.submission.create({
    data: {
      taskId,
      images: urls,
      aiAnalysis: analysis,
    },
  });

  if (task.status !== "COMPLETED" && task.status !== "SUBMITTED") {
    await prisma.task.update({
      where: { id: taskId },
      data: { status: "SUBMITTED" },
    });
  }

  return submission;
}

export async function getStudentProgress(
  studentId: string,
  startDate?: Date,
  endDate?: Date,
  light = false
) {
  const dateFilter: any = {};
  if (startDate || endDate) {
    dateFilter.date = {};
    if (startDate) dateFilter.date.gte = startDate;
    if (endDate) dateFilter.date.lte = endDate;
  }

  const sessions = await prisma.homeworkSession.findMany({
    where: { studentId, ...dateFilter },
    orderBy: { date: "desc" },
    include: {
      tasks: {
        select: { id: true, status: true, subject: true, type: true, description: true, orderIndex: true },
      },
    },
  });

  const totalSessions = sessions.length;
  const allTasks = sessions.flatMap((s) => s.tasks);
  const taskIds = allTasks.map((t) => t.id);

  const completedTasks = allTasks.filter((t) => t.status === "COMPLETED");
  const completionRate = allTasks.length
    ? Math.round((completedTasks.length / allTasks.length) * 100)
    : 0;

  const [totalQ, questionCounts, correctAnswers] = await Promise.all([
    prisma.question.count({ where: { taskId: { in: taskIds } } }),
    prisma.question.groupBy({ by: ["taskId"], where: { taskId: { in: taskIds } }, _count: true }),
    prisma.answer.findMany({
      where: { question: { taskId: { in: taskIds } }, isCorrect: true },
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

  const accuracy = totalQ > 0 ? Math.round((correctAnswers.length / totalQ) * 100) : 0;

  const subjectBreakdown: Record<string, { total: number; completed: number }> = {};
  for (const t of allTasks) {
    const subj = t.subject || "Other";
    if (!subjectBreakdown[subj]) subjectBreakdown[subj] = { total: 0, completed: 0 };
    subjectBreakdown[subj].total++;
    if (t.status === "COMPLETED") subjectBreakdown[subj].completed++;
  }

  return {
    totalSessions,
    totalTasks: allTasks.length,
    completedTasks: completedTasks.length,
    completionRate,
    totalQuestions: totalQ,
    correctAnswers: correctAnswers.length,
    accuracy,
    subjectBreakdown,
    recentSessions: sessions.slice(0, 7).map((s) => ({
      id: s.id,
      date: s.date,
      status: s.status,
      taskCount: s.tasks.length,
    })),
    tasks: sessions.flatMap((s) =>
      s.tasks.map((t) => ({
        id: t.id,
        description: t.description,
        subject: t.subject,
        type: t.type,
        status: t.status,
        sessionDate: s.date,
        sessionId: s.id,
        questionCount: qCountMap[t.id] || 0,
        correctCount: correctByTask[t.id] || 0,
      }))
    ),
  };
}
