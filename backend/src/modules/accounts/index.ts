import accountGroupsRoutes from "./routes/accountGroups.routes";
import express from "express";

const router = express.Router();

// Mount accounts module routes
router.use("/account-groups", accountGroupsRoutes);

export default router;
