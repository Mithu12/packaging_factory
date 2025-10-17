import employeeRoutes from "./routes/employees.routes";
import payrollRoutes from "./routes/payroll.routes";
import leaveRoutes from "./routes/leave.routes";
import attendanceRoutes from "./routes/attendance.routes";
import express from "express";

const router = express.Router();

// Mount HRM module routes
router.use("/employees", employeeRoutes);
router.use("/payroll", payrollRoutes);
router.use("/leave", leaveRoutes);
router.use("/attendance", attendanceRoutes);

export default router;
