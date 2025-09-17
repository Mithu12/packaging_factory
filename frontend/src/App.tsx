import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useFormatting } from "@/hooks/useFormatting";
import { AuthProvider } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Categories from "./pages/Categories";
import Profile from "./pages/Profile";
import Dashboard from "./pages/Dashboard";
import Suppliers from "./pages/Suppliers";
import SupplierDetails from "./pages/SupplierDetails";
import EditSupplier from "./pages/EditSupplier";
import SupplierOrders from "./pages/SupplierOrders";
import Products from "./pages/Products";
import PurchaseOrders from "./pages/PurchaseOrders";
import Inventory from "./pages/Inventory";
import Payments from "./pages/Payments";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import ProductDetails from "./pages/ProductDetails";
import EditProduct from "./pages/EditProduct";
import AdjustStock from "./pages/AdjustStock";
import PurchaseOrderDetails from "./pages/PurchaseOrderDetails";
import EditPurchaseOrder from "./pages/EditPurchaseOrder";
import ReceiveGoods from "./pages/ReceiveGoods";
import InventoryDetails from "./pages/InventoryDetails";
import EditInventory from "./pages/EditInventory";
import ViewInvoice from "./pages/ViewInvoice";
import PaymentHistory from "./pages/PaymentHistory";
import SendReminder from "./pages/SendReminder";
import GenerateStatement from "./pages/GenerateStatement";
import POSManager from "./pages/POSManager";
import UserManagement from "./pages/UserManagement";
import Brands from "./pages/Brands";
import Origins from "./pages/Origins";

const queryClient = new QueryClient();

const App = () => {
  // Initialize formatting settings
  useFormatting();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/dashboard" element={
            <ProtectedRoute requiredRole="viewer">
              <DashboardLayout>
                <Dashboard />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/login" element={<Login />} />
          <Route
            path="/pos-manager"
            element={
              <ProtectedRoute requiredRole="employee">
                <DashboardLayout>
                  <POSManager />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/categories"
            element={
              <ProtectedRoute requiredRole="viewer">
                <DashboardLayout>
                  <Categories />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute requiredRole="viewer">
                <DashboardLayout>
                  <Profile />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/suppliers"
            element={
              <ProtectedRoute requiredRole="viewer">
                <DashboardLayout>
                  <Suppliers />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/suppliers/:id"
            element={
              <ProtectedRoute requiredRole="viewer">
                <DashboardLayout>
                  <SupplierDetails />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/suppliers/:id/edit"
            element={
              <ProtectedRoute requiredRole="manager">
                <DashboardLayout>
                  <EditSupplier />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/suppliers/:id/orders"
            element={
              <ProtectedRoute requiredRole="viewer">
                <DashboardLayout>
                  <SupplierOrders />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/products"
            element={
              <ProtectedRoute requiredRole="viewer">
                <DashboardLayout>
                  <Products />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/products/:id"
            element={
              <ProtectedRoute requiredRole="viewer">
                <DashboardLayout>
                  <ProductDetails />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/products/:id/edit"
            element={
              <ProtectedRoute requiredRole="manager">
                <DashboardLayout>
                  <EditProduct />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/products/:id/adjust-stock"
            element={
              <ProtectedRoute requiredRole="manager">
                <DashboardLayout>
                  <AdjustStock />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/purchase-orders"
            element={
              <ProtectedRoute requiredRole="viewer">
                <DashboardLayout>
                  <PurchaseOrders />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/purchase-orders/:id"
            element={
              <ProtectedRoute requiredRole="viewer">
                <DashboardLayout>
                  <PurchaseOrderDetails />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/purchase-orders/:id/edit"
            element={
              <ProtectedRoute requiredRole="manager">
                <DashboardLayout>
                  <EditPurchaseOrder />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/purchase-orders/:id/receive"
            element={
              <ProtectedRoute requiredRole="employee">
                <DashboardLayout>
                  <ReceiveGoods />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory"
            element={
              <ProtectedRoute requiredRole="viewer">
                <DashboardLayout>
                  <Inventory />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory/:id"
            element={
              <ProtectedRoute requiredRole="viewer">
                <DashboardLayout>
                  <InventoryDetails />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory/:id/edit"
            element={
              <ProtectedRoute requiredRole="manager">
                <DashboardLayout>
                  <EditInventory />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory/:id/adjust"
            element={
              <ProtectedRoute requiredRole="manager">
                <DashboardLayout>
                  <AdjustStock />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/payments"
            element={
              <ProtectedRoute requiredRole="viewer">
                <DashboardLayout>
                  <Payments />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/view-invoice/:invoiceId"
            element={
              <ProtectedRoute requiredRole="viewer">
                <DashboardLayout>
                  <ViewInvoice />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/payment-history/:supplierId?"
            element={
              <ProtectedRoute requiredRole="viewer">
                <DashboardLayout>
                  <PaymentHistory />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/send-reminder/:invoiceId"
            element={
              <ProtectedRoute requiredRole="manager">
                <DashboardLayout>
                  <SendReminder />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/generate-statement/:supplierId?"
            element={
              <ProtectedRoute requiredRole="manager">
                <DashboardLayout>
                  <GenerateStatement />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute requiredRole="viewer">
                <DashboardLayout>
                  <Reports />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute requiredRole="viewer">
                <DashboardLayout>
                  <Settings />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/user-management"
            element={
              <ProtectedRoute requiredRole="admin">
                <DashboardLayout>
                  <UserManagement />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/brands"
            element={
              <ProtectedRoute requiredRole="viewer">
                <DashboardLayout>
                  <Brands />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/origins"
            element={
              <ProtectedRoute requiredRole="viewer">
                <DashboardLayout>
                  <Origins />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
