import customerOrdersRoutes from "./routes/customerOrders.routes";
import customersRoutes from "./routes/customers.routes";
import productsRoutes from "./routes/products.routes";
import factoriesRoutes from "./routes/factories.routes";
import workOrdersRoutes from "./routes/workOrders.routes";
import preProductionEntriesRoutes from "./routes/preProductionEntries.routes";
import bomRoutes from "./routes/bom.routes";
import materialAllocationsRoutes from "./routes/materialAllocations.routes";
import materialConsumptionsRoutes from "./routes/materialConsumptions.routes";
import wastageRoutes from "./routes/wastage.routes";
import productionExecutionRoutes from "./routes/productionExecution.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import productionLinesRoutes from "./routes/productionLines.routes";
import operatorsRoutes from "./routes/operators.routes";
import machinesRoutes from "./routes/machines.routes";
import platesRoutes from "./routes/plates.routes";
import costAnalysisRoutes from "./routes/costAnalysis.routes";
import salesInvoicesRoutes from "./routes/salesInvoices.routes";
import reportsRoutes from "./routes/reports.routes";
import express from "express";

const router = express.Router();

// Mount factory module routes
router.use("/customer-orders", customerOrdersRoutes);
router.use("/customers", customersRoutes);
router.use("/products", productsRoutes);
router.use("/factories", factoriesRoutes);
router.use("/work-orders", workOrdersRoutes);
router.use("/pre-production-entries", preProductionEntriesRoutes);
router.use("/boms", bomRoutes);
router.use("/material-allocations", materialAllocationsRoutes);
router.use("/material-consumptions", materialConsumptionsRoutes);
router.use("/wastage", wastageRoutes);
router.use("/production-runs", productionExecutionRoutes);
router.use("/production-lines", productionLinesRoutes);
router.use("/operators", operatorsRoutes);
router.use("/machines", machinesRoutes);
router.use("/plates", platesRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/cost-analysis", costAnalysisRoutes);
router.use("/sales-invoices", salesInvoicesRoutes);
router.use("/reports", reportsRoutes);

export default router;
