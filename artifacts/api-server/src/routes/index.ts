import { Router, type IRouter } from "express";
import healthRouter from "./health";
import employeesRouter from "./employees";
import attendanceRouter from "./attendance";
import reportsRouter from "./reports";
import authRouter from "./auth";
import usersRouter from "./users";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

// Public routes
router.use(healthRouter);
router.use(authRouter);

// Protected routes — require valid session
router.use(requireAuth);
router.use(employeesRouter);
router.use(attendanceRouter);
router.use(reportsRouter);
router.use(usersRouter);

export default router;
