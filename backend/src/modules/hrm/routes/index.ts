// HRM Module Routes
import express from "express";
import employeesRoutes from "./employees.routes";
import payrollRoutes from "./payroll.routes";
import leaveRoutes from "./leave.routes";
import attendanceRoutes from "./attendance.routes";

const router = express.Router();

// Mount HRM module sub-routes
router.use("/employees", employeesRoutes);
router.use("/payroll", payrollRoutes);
router.use("/leave", leaveRoutes);
router.use("/attendance", attendanceRoutes);

export default router;
