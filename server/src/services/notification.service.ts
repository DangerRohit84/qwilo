import prisma from "../utils/prisma";

export async function notifyParentsOnTaskComplete(
  studentId: string,
  taskId: string
) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { session: true },
  });
  if (!task) return;

  const links = await prisma.studentParent.findMany({
    where: { studentId },
    include: { parent: true },
  });

  await Promise.allSettled(
    links.map(async (link) => {
      if (link.parent.pushToken) {
        await sendPushNotification(link.parent.pushToken, {
          title: "Task Completed! 🎉",
          body: `${task.subject || "Task"} - ${task.description.slice(0, 60)}`,
          data: { studentId, taskId, sessionId: task.sessionId },
        });
      }
    })
  );
}

export async function notifyParentsOnSessionComplete(studentId: string, sessionId: string) {
  const session = await prisma.homeworkSession.findUnique({
    where: { id: sessionId },
    include: { student: true, tasks: true },
  });
  if (!session) return;

  const completed = session.tasks.filter((t) => t.status === "COMPLETED").length;
  const total = session.tasks.length;

  const links = await prisma.studentParent.findMany({
    where: { studentId },
    include: { parent: true },
  });

  await Promise.allSettled(
    links.map(async (link) => {
      if (link.parent.pushToken) {
        await sendPushNotification(link.parent.pushToken, {
          title: `${session.student.name} completed homework!`,
          body: `${completed}/${total} tasks done for ${session.date.toLocaleDateString()}`,
          data: { studentId, sessionId },
        });
      }
    })
  );
}

async function sendPushNotification(
  pushToken: string,
  payload: { title: string; body: string; data?: Record<string, string> }
) {
  try {
    const message = {
      to: pushToken,
      sound: "default",
      title: payload.title,
      body: payload.body,
      data: payload.data || {},
    };

    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN || ""}`,
      },
      body: JSON.stringify(message),
    });
  } catch (err) {
    console.error("Push notification failed:", err);
  }
}
