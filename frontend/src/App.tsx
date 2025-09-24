import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useFormatting } from "@/hooks/useFormatting";
import { AuthProvider } from "@/contexts/AuthContext";
import { RBACProvider } from "@/contexts/RBACContext";
import { DashboardLayout } from "@/components/DashboardLayout";
// import { ProtectedRoute } from "@/components/ProtectedRoute"/;
import { ProtectedRoute as ProtectedRoute } from "@/components/rbac/ProtectedRoute";
import { AccessDenied } from "@/pages/AccessDenied";
import AdminRoute from "@/components/AdminRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Categories from "@/modules/inventory/pages/Categories";
import Profile from "./pages/Profile";
import Dashboard from "./pages/Dashboard";
import Suppliers from "@/modules/inventory/pages/Suppliers";
import SupplierDetails from "@/modules/inventory/pages/SupplierDetails";
import EditSupplier from "@/modules/inventory/pages/EditSupplier";
import SupplierOrders from "@/modules/inventory/pages/SupplierOrders";
import Products from "@/modules/inventory/pages/Products";
import PurchaseOrders from "@/modules/inventory/pages/PurchaseOrders";
import Inventory from "@/modules/inventory/pages/Inventory";
import Payments from "@/modules/sales/pages/Payments";
import PaymentDetails from "@/modules/sales/pages/PaymentDetails";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import ProductDetails from "@/modules/inventory/pages/ProductDetails";
import EditProduct from "@/modules/inventory/pages/EditProduct";
import AdjustStock from "@/modules/inventory/pages/AdjustStock";
import PurchaseOrderDetails from "@/modules/inventory/pages/PurchaseOrderDetails";
import EditPurchaseOrder from "@/modules/inventory/pages/EditPurchaseOrder";
import ReceiveGoods from "@/modules/inventory/pages/ReceiveGoods";
import InventoryDetails from "@/modules/inventory/pages/InventoryDetails";
import EditInventory from "@/modules/inventory/pages/EditInventory";
import ViewInvoice from "@/modules/sales/pages/ViewInvoice";
import PaymentHistory from "@/modules/sales/pages/PaymentHistory";
import SendReminder from "@/modules/sales/pages/SendReminder";
import GenerateStatement from "@/modules/sales/pages/GenerateStatement";
import POSManager from "@/modules/sales/pages/POSManager";
import UserManagement from "./pages/UserManagement";
import Brands from "@/modules/inventory/pages/Brands";
import Origins from "@/modules/inventory/pages/Origins";
import Expenses from "./pages/Expenses";
import ExpenseDetails from "./pages/ExpenseDetails";
import EditExpense from "./pages/EditExpense";
import RoleManagement from "./pages/RoleManagement";
import RBACDashboard from "./pages/RBACDashboard";
import RBACDemo from "./pages/RBACDemo";
import Distribution from "@/modules/inventory/pages/Distribution";
import EditDistributionCenter from "@/modules/inventory/pages/EditDistributionCenter";
import DistributionCenterDetails from "@/modules/inventory/pages/DistributionCenterDetails";

const queryClient = new QueryClient();

const App = () => {
  // Initialize formatting settings
  useFormatting();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RBACProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/dashboard" element={
            <ProtectedRoute >
              <DashboardLayout>
                <Dashboard />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/login" element={<Login />} />
          <Route
            path="/pos-manager"
            element={
              <ProtectedRoute >
                <DashboardLayout>
                  <POSManager />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/categories"
            element={
              <ProtectedRoute >
                <DashboardLayout>
                  <Categories />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute >
                <DashboardLayout>
                  <Profile />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/suppliers"
            element={
              <ProtectedRoute >
                <DashboardLayout>
                  <Suppliers />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/suppliers/:id"
            element={
              <ProtectedRoute >
                <DashboardLayout>
                  <SupplierDetails />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/suppliers/:id/edit"
            element={
              <ProtectedRoute >
                <DashboardLayout>
                  <EditSupplier />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/suppliers/:id/orders"
            element={
              <ProtectedRoute >
                <DashboardLayout>
                  <SupplierOrders />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/products"
            element={
              <ProtectedRoute >
                <DashboardLayout>
                  <Products />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/products/:id"
            element={
              <ProtectedRoute >
                <DashboardLayout>
                  <ProductDetails />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/products/:id/edit"
            element={
              <ProtectedRoute >
                <DashboardLayout>
                  <EditProduct />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/products/:id/adjust-stock"
            element={
              <ProtectedRoute >
                <DashboardLayout>
                  <AdjustStock />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/purchase-orders"
            element={
              <ProtectedRoute >
                <DashboardLayout>
                  <PurchaseOrders />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/purchase-orders/:id"
            element={
              <ProtectedRoute >
                <DashboardLayout>
                  <PurchaseOrderDetails />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/purchase-orders/:id/edit"
            element={
              <ProtectedRoute >
                <DashboardLayout>
                  <EditPurchaseOrder />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/purchase-orders/:id/receive"
            element={
              <ProtectedRoute >
                <DashboardLayout>
                  <ReceiveGoods />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory"
            element={
              <ProtectedRoute >
                <DashboardLayout>
                  <Inventory />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory/:id"
            element={
              <ProtectedRoute >
                <DashboardLayout>
                  <InventoryDetails />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory/:id/edit"
            element={
              <ProtectedRoute >
                <DashboardLayout>
                  <EditInventory />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory/:id/adjust"
            element={
              <ProtectedRoute >
                <DashboardLayout>
                  <AdjustStock />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/payments"
            element={
              <ProtectedRoute >
                <DashboardLayout>
                  <Payments />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/payment-details/:id"
            element={
              <ProtectedRoute >
                <DashboardLayout>
                  <PaymentDetails />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/view-invoice/:invoiceId"
            element={
              <ProtectedRoute >
                <DashboardLayout>
                  <ViewInvoice />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/payment-history/:supplierId?"
            element={
              <ProtectedRoute >
                <DashboardLayout>
                  <PaymentHistory />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/send-reminder/:invoiceId"
            element={
              <ProtectedRoute >
                <DashboardLayout>
                  <SendReminder />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/generate-statement/:supplierId?"
            element={
              <ProtectedRoute >
                <DashboardLayout>
                  <GenerateStatement />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute >
                <DashboardLayout>
                  <Reports />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute >
                <DashboardLayout>
                  <Settings />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/user-management"
            element={
              <ProtectedRoute >
                <DashboardLayout>
                  <UserManagement />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/brands"
            element={
              <ProtectedRoute >
                <DashboardLayout>
                  <Brands />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/origins"
            element={
              <ProtectedRoute >
                <DashboardLayout>
                  <Origins />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          
          {/* Distribution Routes */}
          <Route
            path="/distribution"
            element={
              <ProtectedRoute >
                <DashboardLayout>
                  <Distribution />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/distribution/centers/:id"
            element={
              <ProtectedRoute >
                <DashboardLayout>
                  <DistributionCenterDetails />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/distribution/centers/:id/edit"
            element={
              <ProtectedRoute >
                <DashboardLayout>
                  <EditDistributionCenter />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          
          {/* Expense Routes */}
          <Route
            path="/expenses"
            element={
              <ProtectedRoute >
                <DashboardLayout>
                  <Expenses />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/expenses/:id"
            element={
              <ProtectedRoute >
                <DashboardLayout>
                  <ExpenseDetails />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/expenses/:id/edit"
            element={
              <ProtectedRoute >
                <DashboardLayout>
                  <EditExpense />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          
          {/* RBAC Management Routes */}
          <Route
            path="/rbac"
            element={
              <ProtectedRoute >
                <DashboardLayout>
                  <RBACDashboard />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/roles"
            element={
              <ProtectedRoute >
                <DashboardLayout>
                  <RoleManagement />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          
          {/* RBAC Demo Route */}
          <Route path="/rbac-demo" element={
            <ProtectedRoute >
              <DashboardLayout>
                <RBACDemo />
              </DashboardLayout>
            </ProtectedRoute>
          } />

          {/* Access Denied Route */}
          <Route path="/access-denied" element={<AccessDenied />} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </BrowserRouter>
        </TooltipProvider>
        </RBACProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;

