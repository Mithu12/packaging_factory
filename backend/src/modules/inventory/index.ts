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
import { registerInventoryAccountingListeners, inventoryAccountsIntegrationService } from "@/services/inventoryAccountsIntegrationService";
import express from "express";
import { interModuleConnector } from "@/utils/InterModuleConnector";
import purchaseReportsRoutes from "@/modules/inventory/routes/purchase-reports.routes";

// Register inventory accounting listeners
// This is now handled via InterModuleConnector called directly from Inventory mediators
// registerInventoryAccountingListeners();

// Register with InterModuleConnector for cross-module communication
interModuleConnector.register('invModule', {
  addPurchaseStock: inventoryAccountsIntegrationService.createPurchaseOrderReceiptVoucher.bind(inventoryAccountsIntegrationService),
  adjustStock: inventoryAccountsIntegrationService.createStockAdjustmentVoucher.bind(inventoryAccountsIntegrationService)
});

const router = express.Router();
// Mount inventory-module-routes
router.use("/inventory", inventoryRouter);
router.use("/inventory/reports", purchaseReportsRoutes);
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
