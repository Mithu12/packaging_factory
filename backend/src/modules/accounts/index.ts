import accountGroupsRoutes from "./routes/accountGroups.routes";
import chartOfAccountsRoutes from "./routes/chartOfAccounts.routes";
import costCentersRoutes from "./routes/costCenters.routes";
import vouchersRoutes from "./routes/vouchers.routes";
import voucherFailuresRoutes from "./routes/voucherFailures.routes";
import ledgerRoutes from "./routes/ledger.routes";
import reportsRoutes from "./routes/reports.routes";
import chequesRoutes from "./routes/cheques.routes";
import bankReconciliationRoutes from "./routes/bankReconciliation.routes";
import express from "express";

const router = express.Router();

// Mount accounts module routes
router.use("/account-groups", accountGroupsRoutes);
router.use("/chart-of-accounts", chartOfAccountsRoutes);
router.use("/cost-centers", costCentersRoutes);
router.use("/vouchers", vouchersRoutes);
router.use("/voucher-failures", voucherFailuresRoutes);
router.use("/ledger", ledgerRoutes);
router.use("/reports", reportsRoutes);
router.use("/cheques", chequesRoutes);
router.use("/bank-reconciliation", bankReconciliationRoutes);

export default router;
