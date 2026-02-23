import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import path from "path";

// Import routes
import authRoutes from "./routes/auth.routes";
import settingsRoutes from "./routes/settings.routes";
import customerRoutes from "./routes/customers.routes";
import salesOrderRoutes from "./routes/salesOrders.routes";
import expenseRoutes from "./routes/expenses.routes";
import expenseCategoryRoutes from "./routes/expenseCategories.routes";
import roleRoutes from "./routes/roles.routes";
import rbacRoutes from "./routes/rbac.routes";
import returnsRoutes from "./routes/returns.routes";
import licenseRoutes from "./routes/license.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import backupRoutes from "./routes/backup.routes";
import { errorHandler } from "./middleware/errorHandler";
import { MyLogger } from "./utils/new-logger";
import inventoryRoutes from "./modules/inventory";
import accountsRoutes from "./modules/accounts";
import factoryRoutes from "./modules/factory";
import hrmRoutes from "./modules/hrm/routes";
import salesRoutes from "./modules/sales";
import salesRepRoutes from "./modules/salesrep";
import ecommerceRoutes from "./modules/ecommerce/routes";
import { logRoutes } from "./utils/RouteLogger";
// Import module initializers
import { initializeAccountsModule } from "./modules/accounts/moduleInit";
import { initializeExpensesModule } from "./modules/expenses/moduleInit";
import { initializeFactoryModule } from "./modules/factory/moduleInit";
import { initializeHRMModule } from "./modules/hrm/moduleInit";
import { initializeSalesRepModule } from "./modules/salesrep/moduleInit";
import { initializeEcommerceModule } from "./modules/ecommerce/moduleInit";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Prefer package src in dev (tsx watch), fall back to dist in prod
// Temporarily disabled due to TypeScript configuration issues
// eslint-disable-next-line @typescript-eslint/no-var-requires
// const inventoryRoutes = (() => {
//   try {
//     // Dev: use TS sources
//     // eslint-disable-next-line @typescript-eslint/no-var-requires
//     return require("../packages/inventory/src").default;
//   } catch (_) {
//     // Build/Prod: use compiled dist
//     // eslint-disable-next-line @typescript-eslint/no-var-requires
//     return require("../packages/inventory/dist").default;
//   }
// })();

// Security middleware
// app.use(helmet());

// Rate limiting - more permissive for testing
const isTestEnvironment = process.env.NODE_ENV === 'test';
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minutes
  max: isTestEnvironment ? 5000 : 500, // Higher limit for tests: 5000 vs 500 for production
  message: "Too many requests from this IP, please try again later.",
  skip: (req) => {
    // Skip rate limiting for health checks and test requests
    return req.path === '/health' || isTestEnvironment;
  }
});

// Only apply rate limiting in production
if (!isTestEnvironment) {
  app.use(limiter);
}

// CORS configuration
const allowedOrigins = process.env.CORS_ORIGIN?.split(",") || [];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.log("CORS blocked origin:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
    exposedHeaders: ["Set-Cookie"],
  })
);

// Logging
app.use(morgan("combined"));

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Cookie parsing middleware
app.use(cookieParser());

// Static file serving for uploaded images with CORS headers for cross-origin canvas access
app.use("/uploads", (req, res, next) => {
  // Set headers to allow cross-origin access for images (needed for canvas operations)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(process.cwd(), "uploads")));

// Health check endpoint
app.get("/health", (req, res) => {
  let action = "Health Check";
  try {
    MyLogger.info(action, { ip: req.ip, userAgent: req.get("User-Agent") });
    const healthData = {
      status: "OK",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
    MyLogger.success(action, healthData);
    res.status(200).json(healthData);
  } catch (error: any) {
    MyLogger.error(action, error, { ip: req.ip });
    res.status(500).json({ status: "ERROR", message: "Health check failed" });
  }
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/license", licenseRoutes);
app.use("/api", inventoryRoutes);
app.use("/api/accounts", accountsRoutes);
app.use("/api/factory", factoryRoutes);
app.use("/api/hrm", hrmRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/salesrep", salesRepRoutes);
app.use("/api/ecom", ecommerceRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/sales-orders", salesOrderRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/expense-categories", expenseCategoryRoutes);
app.use("/api/rbac", rbacRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/returns", returnsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/backup", backupRoutes);

// 404 handler
app.use("*", (req, res) => {
  let action = "404 Route Not Found";
  try {
    MyLogger.warn(action, {
      path: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });
    res.status(404).json({
      error: "Route not found",
      path: req.originalUrl,
    });
  } catch (error: any) {
    MyLogger.error(action, error, { path: req.originalUrl });
    res.status(500).json({ error: "Internal server error" });
  }
});

// Error handling middleware
app.use(errorHandler);

// Initialize modules with loose coupling
const initializeModules = async (): Promise<void> => {
  let action = "Module Initialization";
  try {
    MyLogger.info(action, { message: "Starting module initialization" });

    // Initialize accounts module first (since expenses may depend on it)
    console.log("🔧 Initializing accounts module...");
    initializeAccountsModule();

    // Initialize expenses module (will automatically set up accounts integration if available)
    console.log("🔧 Initializing expenses module...");
    initializeExpensesModule();

    // Initialize factory module
    console.log("🔧 Initializing factory module...");
    initializeFactoryModule();

    // Initialize HRM module
    console.log("🔧 Initializing HRM module...");
    initializeHRMModule();

    // Initialize Sales Rep module
    console.log("🔧 Initializing Sales Rep module...");
    initializeSalesRepModule();

    // Initialize Ecommerce module
    console.log("🔧 Initializing Ecommerce module...");
    initializeEcommerceModule();

    MyLogger.success(action, {
      message: "All modules initialized successfully",
      availableModules: ['accounts', 'expenses', 'factory', 'hrm', 'salesrep', 'ecommerce']
    });

    console.log("✅ Module initialization completed successfully");

  } catch (error: any) {
    MyLogger.error(action, error);
    console.error("❌ Module initialization failed:", error.message);
    // Don't throw - server should still start even if module initialization fails
    console.warn("Module initialization failed, but server will continue:", error.message);
  }
};

// Start server - bind to 0.0.0.0 to ensure IPv4 compatibility
app.listen(Number(PORT), '0.0.0.0', async () => {
  let action = "Server Startup";
  try {
    // Initialize modules after server starts
    await initializeModules();

    const serverInfo = {
      port: PORT,
      healthCheckUrl: `http://localhost:${PORT}/health`,
      apiBaseUrl: `http://localhost:${PORT}/api`,
      environment: process.env.NODE_ENV || "development",
    };
    MyLogger.success(action, serverInfo);
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
    // Log all registered routes
    logRoutes(app);
  } catch (error: any) {
    MyLogger.error(action, error, { port: PORT });
    console.error("Failed to start server:", error);
  }
});

export default app;
