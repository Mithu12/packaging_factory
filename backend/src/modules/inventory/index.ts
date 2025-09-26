import inventoryRouter from "./routes/inventory.routes";
import suppliersRoutes from "@/modules/inventory/routes/suppliers.routes";
import categoriesRoutes from "@/modules/inventory/routes/categories.routes";
import productsRoutes from "@/modules/inventory/routes/products.routes";
import purchaseOrdersRoutes from "@/modules/inventory/routes/purchaseOrders.routes";
import stockAdjustmentsRoutes from "@/modules/inventory/routes/stockAdjustments.routes";
import supplierCategoriesRoutes from "@/modules/inventory/routes/supplierCategories.routes";
import brandsRoutes from "@/modules/inventory/routes/brands.routes";
import originsRoutes from "@/modules/inventory/routes/origins.routes";
import paymentsRoutes from "@/modules/inventory/routes/payments.routes";
import distributionRoutes from "@/modules/inventory/routes/distribution.routes";
import express from "express";

const router = express.Router();
// Mount sub-routes
router.use("/inventory", inventoryRouter);
router.use("/suppliers", suppliersRoutes);
router.use("/categories", categoriesRoutes);
router.use("/products", productsRoutes);
router.use("/purchase-orders", purchaseOrdersRoutes);
router.use("/stock-adjustments", stockAdjustmentsRoutes);
router.use("/supplier-categories", supplierCategoriesRoutes);
router.use("/brands", brandsRoutes);
router.use("/origins", originsRoutes);
router.use("/payments", paymentsRoutes);
router.use("/distribution", distributionRoutes);
export default router;
