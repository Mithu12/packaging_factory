import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/categories" element={<DashboardLayout><Categories /></DashboardLayout>} />
          <Route path="/profile" element={<DashboardLayout><Profile /></DashboardLayout>} />
          <Route path="/suppliers" element={<DashboardLayout><Suppliers /></DashboardLayout>} />
          <Route path="/suppliers/:id" element={<DashboardLayout><SupplierDetails /></DashboardLayout>} />
          <Route path="/suppliers/:id/edit" element={<DashboardLayout><EditSupplier /></DashboardLayout>} />
          <Route path="/suppliers/:id/orders" element={<DashboardLayout><SupplierOrders /></DashboardLayout>} />
          <Route path="/products" element={<DashboardLayout><Products /></DashboardLayout>} />
          <Route path="/products/:id" element={<DashboardLayout><ProductDetails /></DashboardLayout>} />
          <Route path="/products/:id/edit" element={<DashboardLayout><EditProduct /></DashboardLayout>} />
          <Route path="/products/:id/adjust-stock" element={<DashboardLayout><AdjustStock /></DashboardLayout>} />
          <Route path="/purchase-orders" element={<DashboardLayout><PurchaseOrders /></DashboardLayout>} />
          <Route path="/purchase-orders/:id" element={<DashboardLayout><PurchaseOrderDetails /></DashboardLayout>} />
          <Route path="/purchase-orders/:id/edit" element={<DashboardLayout><EditPurchaseOrder /></DashboardLayout>} />
          <Route path="/purchase-orders/:id/receive" element={<DashboardLayout><ReceiveGoods /></DashboardLayout>} />
          <Route path="/inventory" element={<DashboardLayout><Inventory /></DashboardLayout>} />
          <Route path="/inventory/:id" element={<DashboardLayout><InventoryDetails /></DashboardLayout>} />
          <Route path="/inventory/:id/edit" element={<DashboardLayout><EditInventory /></DashboardLayout>} />
          <Route path="/inventory/:id/adjust" element={<DashboardLayout><AdjustStock /></DashboardLayout>} />
          <Route path="/payments" element={<DashboardLayout><Payments /></DashboardLayout>} />
          <Route path="/reports" element={<DashboardLayout><Reports /></DashboardLayout>} />
          <Route path="/settings" element={<DashboardLayout><Settings /></DashboardLayout>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
