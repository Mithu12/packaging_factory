import express from "express";
import { authenticate } from "@/middleware/auth";
import { requirePermission, PERMISSIONS } from "@/middleware/permission";
import expressAsyncHandler from "express-async-handler";
import ProductsController from "../controllers/products.controller";

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// GET /api/factory/products - Get all products (unfiltered)
router.get(
  "/",
  requirePermission(PERMISSIONS.FACTORY_ORDERS_READ),
  expressAsyncHandler(ProductsController.getAllProducts)
);

// GET /api/factory/products/orderable - Get orderable products (excludes Raw Materials)
router.get(
  "/orderable",
  requirePermission(PERMISSIONS.FACTORY_ORDERS_READ),
  expressAsyncHandler(ProductsController.getOrderableProducts)
);

// GET /api/factory/products/search - Search products
router.get(
  "/search",
  requirePermission(PERMISSIONS.FACTORY_ORDERS_READ),
  expressAsyncHandler(ProductsController.searchProducts)
);

export default router;
