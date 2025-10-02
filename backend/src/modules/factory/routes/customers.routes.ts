import express from "express";
import { authenticate } from "@/middleware/auth";
import { requirePermission, PERMISSIONS } from "@/middleware/permission";
import expressAsyncHandler from "express-async-handler";
import CustomersController from "../controllers/customers.controller";
import {
  createCustomerSchema,
  updateCustomerSchema,
  customerIdSchema,
} from "../validation/customerValidation";
import { MyLogger } from "@/utils/new-logger";

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Validation middleware
const validateRequest = (schema: any) => {
  return (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    const action = "Validate Request Body";
    try {
      MyLogger.info(action, { endpoint: req.path, method: req.method });
      const { error, value } = schema.validate(req.body);
      if (error) {
        MyLogger.warn(action, {
          endpoint: req.path,
          method: req.method,
          validationErrors: error.details,
        });
        res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.details
        });
        return;
      }
      req.body = value;
      next();
    } catch (error: any) {
      MyLogger.error(action, error, {
        endpoint: req.path,
        method: req.method,
      });
      next(error);
    }
  };
};

const validateParams = (schema: any) => {
  return (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    const action = "Validate Route Parameters";
    try {
      MyLogger.info(action, { endpoint: req.path, method: req.method });
      const { error, value } = schema.validate(req.params);
      if (error) {
        MyLogger.warn(action, {
          endpoint: req.path,
          method: req.method,
          validationErrors: error.details,
        });
        res.status(400).json({
          success: false,
          message: "Parameter validation error",
          errors: error.details
        });
        return;
      }
      req.params = value;
      next();
    } catch (error: any) {
      MyLogger.error(action, error, {
        endpoint: req.path,
        method: req.method,
      });
      next(error);
    }
  };
};

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
  validateParams(customerIdSchema),
  expressAsyncHandler(CustomersController.getCustomerById)
);

// POST /api/factory/customers - Create new customer
router.post(
  "/",
  requirePermission(PERMISSIONS.FACTORY_ORDERS_CREATE),
  validateRequest(createCustomerSchema),
  expressAsyncHandler(CustomersController.createCustomer)
);

// PUT /api/factory/customers/:id - Update customer
router.put(
  "/:id",
  requirePermission(PERMISSIONS.FACTORY_ORDERS_UPDATE),
  validateParams(customerIdSchema),
  validateRequest(updateCustomerSchema),
  expressAsyncHandler(CustomersController.updateCustomer)
);

// DELETE /api/factory/customers/:id - Delete customer
router.delete(
  "/:id",
  requirePermission(PERMISSIONS.FACTORY_ORDERS_DELETE),
  validateParams(customerIdSchema),
  expressAsyncHandler(CustomersController.deleteCustomer)
);

export default router;
