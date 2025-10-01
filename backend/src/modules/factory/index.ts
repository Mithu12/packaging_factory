import customerOrdersRoutes from "./routes/customerOrders.routes";
import express from "express";

const router = express.Router();

// Mount factory module routes
router.use("/customer-orders", customerOrdersRoutes);

export default router;
