import express from 'express';
import { authenticate } from "@/middleware/auth";
import { requirePermission, PERMISSIONS } from '@/middleware/permission';
import expressAsyncHandler from "express-async-handler";
import SalesCustomersController from "../controllers/customers.controller";

const router = express.Router();

// GET /api/sales/customers/:customerId/orders-with-due - Get customer orders with due amounts
router.get('/:customerId/orders-with-due',
  authenticate,
  requirePermission(PERMISSIONS.CUSTOMERS_READ),
  expressAsyncHandler(SalesCustomersController.getCustomerOrdersWithDueAmounts)
);

// GET /api/sales/customers/:customerId/payment-history - Get customer payment history
router.get('/:customerId/payment-history',
  authenticate,
  requirePermission(PERMISSIONS.CUSTOMERS_READ),
  expressAsyncHandler(SalesCustomersController.getCustomerPaymentHistory)
);

export default router;
