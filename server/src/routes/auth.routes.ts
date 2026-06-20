import { Router, Request, Response } from "express";
import * as authService from "../services/auth.service";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();

router.post("/register", async (req: Request, res: Response) => {
  try {
    const { email, password, name, role, parentEmail } = req.body;
    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (!["STUDENT", "PARENT", "TEACHER"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }
    const result = await authService.register(email, password, name, role, parentEmail);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }
    const result = await authService.login(email, password);
    res.json(result);
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
});

router.get("/me", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await authService.getProfile(req.user!.id);
    res.json(user);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

router.put("/push-token", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { pushToken } = req.body;
    await authService.updatePushToken(req.user!.id, pushToken);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
