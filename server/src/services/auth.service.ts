import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../utils/prisma";

export async function register(
  email: string,
  password: string,
  name: string,
  role: "STUDENT" | "PARENT" | "TEACHER",
  parentEmail?: string
) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("Email already registered");

  if (password.length < 6) throw new Error("Password must be at least 6 characters");

  const passwordHash = await bcrypt.hash(password, 12);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email, passwordHash, name, role },
    });

    if (role === "STUDENT") {
      if (!parentEmail) throw new Error("Parent email is required for student registration");

      const parent = await tx.user.findUnique({
        where: { email: parentEmail },
      });
      if (!parent || parent.role !== "PARENT") {
        throw new Error("Parent not found with that email");
      }
      await tx.studentParent.create({
        data: { studentId: user.id, parentId: parent.id },
      });
    }

    return user;
  });

  const token = generateToken(result.id, result.email, result.role);
  return { token, user: { id: result.id, email: result.email, name: result.name, role: result.role } };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("Invalid email or password");

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new Error("Invalid email or password");

  const token = generateToken(user.id, user.email, user.role);
  return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
}

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, pushToken: true },
  });
  if (!user) throw new Error("User not found");
  return user;
}

export async function updatePushToken(userId: string, pushToken: string) {
  if (typeof pushToken !== "string" || pushToken.length > 500) {
    throw new Error("Invalid push token");
  }
  return prisma.user.update({
    where: { id: userId },
    data: { pushToken },
  });
}

function generateToken(id: string, email: string, role: string) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not configured");
  return jwt.sign({ id, email, role }, secret, {
    expiresIn: (process.env.JWT_EXPIRES_IN || "7d") as jwt.SignOptions["expiresIn"],
  });
}
