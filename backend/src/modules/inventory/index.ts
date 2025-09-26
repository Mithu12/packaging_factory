import inventoryRouter from "./routes/inventory.routes";
import suppliersRoutes from "@/modules/inventory/routes/suppliers.routes";
import categoriesRoutes from "@/modules/inventory/routes/categories.routes";
import productsRoutes from "@/modules/inventory/routes/products.routes";
import purchaseOrdersRoutes from "@/modules/inventory/routes/purchaseOrders.routes";
import stockAdjustmentsRoutes from "@/modules/inventory/routes/stockAdjustments.routes";
import express from "express";

const router = express.Router();
// Mount sub-routes
router.use("/inventory", inventoryRouter);
router.use("/suppliers", suppliersRoutes);
router.use("/categories", categoriesRoutes);
router.use("/products", productsRoutes);
router.use("/purchase-orders", purchaseOrdersRoutes);
router.use("/stock-adjustments", stockAdjustmentsRoutes);
export default router;
