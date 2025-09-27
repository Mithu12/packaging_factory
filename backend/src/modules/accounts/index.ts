import accountGroupsRoutes from "./routes/accountGroups.routes";
import chartOfAccountsRoutes from "./routes/chartOfAccounts.routes";
import express from "express";

const router = express.Router();

// Mount accounts module routes
router.use("/account-groups", accountGroupsRoutes);
router.use("/chart-of-accounts", chartOfAccountsRoutes);

export default router;
