import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";

dotenv.config();

import authRoutes from "./routes/auth.routes";
import studentRoutes from "./routes/student.routes";
import parentRoutes from "./routes/parent.routes";

process.on("unhandledRejection", (reason: any) => {
  console.error("Unhandled rejection:", reason?.message || reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err.message);
});

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "5mb" }));

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 100;
const RATE_WINDOW = 60_000;

app.use((req, res, next) => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return next();
  }
  entry.count++;
  if (entry.count > RATE_LIMIT) {
    return res.status(429).json({ error: "Too many requests" });
  }
  next();
});

app.use("/api/auth", authRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/parent", parentRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error("Unhandled error:", err);
  const status = err.statusCode || err.status || 500;
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "File too large. Max size is 25MB." });
  }
  if (status >= 500) {
    return res.status(status).json({ error: "Internal server error" });
  }
  res.status(status).json({ error: err.message || "Request failed" });
});

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(ip);
  }
}, 60_000);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
