import accountGroupsRoutes from "./routes/accountGroups.routes";
import chartOfAccountsRoutes from "./routes/chartOfAccounts.routes";
import costCentersRoutes from "./routes/costCenters.routes";
import vouchersRoutes from "./routes/vouchers.routes";
import express from "express";

const router = express.Router();

// Mount accounts module routes
router.use("/account-groups", accountGroupsRoutes);
router.use("/chart-of-accounts", chartOfAccountsRoutes);
router.use("/cost-centers", costCentersRoutes);
router.use("/vouchers", vouchersRoutes);

export default router;
