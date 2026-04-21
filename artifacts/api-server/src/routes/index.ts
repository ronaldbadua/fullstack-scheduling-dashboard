import { Router, type IRouter } from "express";
import healthRouter from "./health";
import schedulingRouter from "./scheduling";

const router: IRouter = Router();

router.use(healthRouter);
router.use(schedulingRouter);

export default router;
