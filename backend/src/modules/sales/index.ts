import salesReportsRoutes from "./routes/sales-reports.routes";
import express from "express";

const router = express.Router();

router.use("/", salesReportsRoutes);

export default router;
