import express from "express";
import { authenticate } from "@/middleware/auth";
import { requirePermission, PERMISSIONS } from "@/middleware/permission";
import expressAsyncHandler from "express-async-handler";
import CustomersController from "../controllers/customers.controller";

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// GET /api/factory/customers - Get all customers
router.get(
  "/",
  requirePermission(PERMISSIONS.FACTORY_ORDERS_READ),
  expressAsyncHandler(CustomersController.getAllCustomers)
);

// GET /api/factory/customers/search - Search customers
router.get(
  "/search",
  requirePermission(PERMISSIONS.FACTORY_ORDERS_READ),
  expressAsyncHandler(CustomersController.searchCustomers)
);

// GET /api/factory/customers/:id - Get customer by ID
router.get(
  "/:id",
  requirePermission(PERMISSIONS.FACTORY_ORDERS_READ),
  expressAsyncHandler(CustomersController.getCustomerById)
);

// POST /api/factory/customers - Create new customer
router.post(
  "/",
  requirePermission(PERMISSIONS.FACTORY_ORDERS_CREATE),
  expressAsyncHandler(CustomersController.createCustomer)
);

// PUT /api/factory/customers/:id - Update customer
router.put(
  "/:id",
  requirePermission(PERMISSIONS.FACTORY_ORDERS_UPDATE),
  expressAsyncHandler(CustomersController.updateCustomer)
);

// DELETE /api/factory/customers/:id - Delete customer
router.delete(
  "/:id",
  requirePermission(PERMISSIONS.FACTORY_ORDERS_DELETE),
  expressAsyncHandler(CustomersController.deleteCustomer)
);

export default router;
