import customerOrdersRoutes from "./routes/customerOrders.routes";
import customersRoutes from "./routes/customers.routes";
import productsRoutes from "./routes/products.routes";
import factoriesRoutes from "./routes/factories.routes";
import express from "express";

const router = express.Router();

// Mount factory module routes
router.use("/customer-orders", customerOrdersRoutes);
router.use("/customers", customersRoutes);
router.use("/products", productsRoutes);
router.use("/factories", factoriesRoutes);

export default router;
