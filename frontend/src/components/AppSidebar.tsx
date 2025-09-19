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
import { hasPermission, Role } from "@/utils/rbac";
import RoleGuard from "@/components/RoleGuard";

const menuItems = [
  { 
    title: "Dashboard", 
    url: "/", 
    icon: BarChart3, 
    module: "dashboard", 
    action: "view" 
  },
  { 
    title: "POS Manager", 
    url: "/pos-manager", 
    icon: Calculator, 
    module: "pos", 
    action: "view" 
  },
  { 
    title: "Suppliers", 
    url: "/suppliers", 
    icon: Users, 
    module: "suppliers", 
    action: "view" 
  },
  { 
    title: "Products", 
    url: "/products", 
    icon: Package, 
    module: "products", 
    action: "view" 
  },
  { 
    title: "Categories", 
    url: "/categories", 
    icon: FolderTree, 
    module: "categories", 
    action: "view" 
  },
  { 
    title: "Brands", 
    url: "/brands", 
    icon: Tag, 
    module: "brands", 
    action: "view" 
  },
  { 
    title: "Origins", 
    url: "/origins", 
    icon: MapPin, 
    module: "origins", 
    action: "view" 
  },
  { 
    title: "Purchase Orders", 
    url: "/purchase-orders", 
    icon: ShoppingCart, 
    module: "purchase_orders", 
    action: "view" 
  },
  { 
    title: "Inventory", 
    url: "/inventory", 
    icon: Truck, 
    module: "inventory", 
    action: "view" 
  },
  { 
    title: "Payments", 
    url: "/payments", 
    icon: DollarSign, 
    module: "payments", 
    action: "view" 
  },
  { 
    title: "Expenses", 
    url: "/expenses", 
    icon: Receipt, 
    module: "expenses", 
    action: "view" 
  },
  { 
    title: "Reports", 
    url: "/reports", 
    icon: FileText, 
    module: "reports", 
    action: "view" 
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";
  const { user } = useAuth();

  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/";
    return currentPath.startsWith(path);
  };

  const getNavCls = (path: string) =>
    isActive(path)
      ? "bg-primary text-primary-foreground font-medium"
      : "hover:bg-accent hover:text-accent-foreground";

  // Filter menu items based on user permissions
  const visibleMenuItems = menuItems.filter(item => 
    hasPermission(user, item.module, item.action)
  );

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
              {visibleMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavCls(item.url)}>
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <RoleGuard module="users" action="view">
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
              </RoleGuard>
              <RoleGuard module="rbac" action="view">
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/rbac" className={getNavCls("/rbac")}>
                      <Shield className="h-4 w-4" />
                      {!isCollapsed && <span>RBAC Management</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </RoleGuard>
              <RoleGuard module="settings" action="view">
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/settings" className={getNavCls("/settings")}>
                      <Settings className="h-4 w-4" />
                      {!isCollapsed && <span>Settings</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </RoleGuard>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
