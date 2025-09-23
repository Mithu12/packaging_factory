import { NavLink, useLocation } from "react-router-dom";
import {
  Package,
  Users,
  ShoppingCart,
  BarChart3,
  FileText,
  Truck,
  DollarSign,
  Settings,
  FolderTree,
  Calculator,
  UserCog,
  Tag,
  MapPin,
  Receipt,
  Shield,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useRBAC } from "@/contexts/RBACContext";
import { PermissionGuard, SystemAdminGuard } from "@/components/rbac/PermissionGuard";
import { PERMISSIONS } from "@/types/rbac";

const menuItems = [
  { 
    title: "Dashboard", 
    url: "/", 
    icon: BarChart3, 
    permission: null // Dashboard is accessible to all authenticated users
  },
  { 
    title: "POS Manager", 
    url: "/pos-manager", 
    icon: Calculator, 
    permission: PERMISSIONS.SALES_ORDERS_CREATE // POS requires sales order creation
  },
  { 
    title: "Suppliers", 
    url: "/suppliers", 
    icon: Users, 
    permission: PERMISSIONS.SUPPLIERS_READ
  },
  { 
    title: "Products", 
    url: "/products", 
    icon: Package, 
    permission: PERMISSIONS.PRODUCTS_READ
  },
  { 
    title: "Categories", 
    url: "/categories", 
    icon: FolderTree, 
    permission: PERMISSIONS.CATEGORIES_READ
  },
  { 
    title: "Brands", 
    url: "/brands", 
    icon: Tag, 
    permission: PERMISSIONS.BRANDS_READ
  },
  { 
    title: "Origins", 
    url: "/origins", 
    icon: MapPin, 
    permission: PERMISSIONS.ORIGINS_READ
  },
  { 
    title: "Purchase Orders", 
    url: "/purchase-orders", 
    icon: ShoppingCart, 
    permission: PERMISSIONS.PURCHASE_ORDERS_READ
  },
  { 
    title: "Inventory", 
    url: "/inventory", 
    icon: Truck, 
    permission: PERMISSIONS.INVENTORY_TRACK
  },
    {
      title: "Distribution",
      url: "/distribution",
      icon: Truck,
      permission: PERMISSIONS.WAREHOUSES_READ
    },
  { 
    title: "Payments", 
    url: "/payments", 
    icon: DollarSign, 
    permission: PERMISSIONS.PAYMENTS_READ
  },
  { 
    title: "Expenses", 
    url: "/expenses", 
    icon: Receipt, 
    permission: PERMISSIONS.EXPENSES_READ
  },
  { 
    title: "Reports", 
    url: "/reports", 
    icon: FileText,
    permission: null // Reports might be accessible to all users
  },
  // { 
  //   title: "RBAC Demo", 
  //   url: "/rbac-demo", 
  //   icon: Shield,
  //   permission: null // Demo accessible to all authenticated users
  // },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";
  const { user } = useAuth();
  const { hasPermission, isLoading } = useRBAC();

  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/";
    return currentPath.startsWith(path);
  };

  const getNavCls = (path: string) =>
    isActive(path)
      ? "bg-primary text-primary-foreground font-medium"
      : "hover:bg-accent hover:text-accent-foreground";

  // Filter menu items based on user permissions
  const visibleMenuItems = menuItems.filter(item => {
    // If no permission required, show to all authenticated users
    if (!item.permission) return true;
    
    // If RBAC is still loading, don't show permission-protected items yet
    if (isLoading) return false;
    
    // Check if user has the required permission
    return hasPermission(item.permission);
  });

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4 border-b">
          <h2
            className={`font-bold text-lg ${isCollapsed ? "hidden" : "block"}`}
          >
            ERP
          </h2>
          {isCollapsed && (
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
              <Package className="w-4 h-4 text-primary-foreground" />
            </div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className={isCollapsed ? "hidden" : "block"}>
            Main Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {isLoading ? (
                // Show loading skeleton while permissions are loading
                <>
                  <SidebarMenuItem>
                    <div className="flex items-center space-x-2 p-2">
                      <div className="w-4 h-4 bg-gray-300 rounded animate-pulse"></div>
                      {!isCollapsed && <div className="w-20 h-4 bg-gray-300 rounded animate-pulse"></div>}
                    </div>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <div className="flex items-center space-x-2 p-2">
                      <div className="w-4 h-4 bg-gray-300 rounded animate-pulse"></div>
                      {!isCollapsed && <div className="w-24 h-4 bg-gray-300 rounded animate-pulse"></div>}
                    </div>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <div className="flex items-center space-x-2 p-2">
                      <div className="w-4 h-4 bg-gray-300 rounded animate-pulse"></div>
                      {!isCollapsed && <div className="w-16 h-4 bg-gray-300 rounded animate-pulse"></div>}
                    </div>
                  </SidebarMenuItem>
                </>
              ) : (
                visibleMenuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} className={getNavCls(item.url)}>
                        <item.icon className="h-4 w-4" />
                        {!isCollapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel className={isCollapsed ? "hidden" : "block"}>
            Administration
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <PermissionGuard permission={PERMISSIONS.USERS_READ}>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/user-management"
                      className={getNavCls("/user-management")}
                    >
                      <UserCog className="h-4 w-4" />
                      {!isCollapsed && <span>User Management</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </PermissionGuard>
              
              <SystemAdminGuard>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/rbac" className={getNavCls("/rbac")}>
                      <Shield className="h-4 w-4" />
                      {!isCollapsed && <span>RBAC Management</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SystemAdminGuard>
              
              <PermissionGuard permission={PERMISSIONS.SETTINGS_READ}>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/settings" className={getNavCls("/settings")}>
                      <Settings className="h-4 w-4" />
                      {!isCollapsed && <span>Settings</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </PermissionGuard>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
