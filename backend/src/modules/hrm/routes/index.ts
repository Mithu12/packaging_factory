// HRM Module Routes
import express from "express";
import employeesRoutes from "./employees.routes";
import payrollRoutes from "./payroll.routes";
import leaveRoutes from "./leave.routes";
import attendanceRoutes from "./attendance.routes";
import departmentsRoutes from "./departments.routes";
import designationsRoutes from "./designations.routes";
import shiftsRoutes from "./shifts.routes";
import attendanceRegularizationRoutes from "./attendance-regularization.routes";

const router = express.Router();

// Mount HRM module sub-routes
router.use("/employees", employeesRoutes);
router.use("/payroll", payrollRoutes);
router.use("/leave", leaveRoutes);
router.use("/attendance", attendanceRoutes);
router.use("/departments", departmentsRoutes);
router.use("/designations", designationsRoutes);
router.use("/shifts", shiftsRoutes);
router.use("/attendance-regularization", attendanceRegularizationRoutes);

export default router;
