import { useCallback, useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Package,
  ChevronDown,
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
  Layers,
  GitBranch,
  Building2,
  Wallet,
  Banknote,
  NotebookPen,
  ArrowLeftRight,
  Notebook,
  LineChart,
  Scale,
  Shield,
  Calendar,
  Activity,
  AlertTriangle,
  Wrench,
  ClipboardList,
  TrendingUp,
  Package2,
  Calculator as CalculatorIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useRBAC } from "@/contexts/RBACContext";
import {
  PermissionGuard,
  SystemAdminGuard,
} from "@/components/rbac/PermissionGuard";
import { ModuleStatusIndicator } from '@/components/ModuleStatusIndicator';
import { PERMISSIONS, type PermissionCheck } from "@/types/rbac";

type MenuItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  permission: PermissionCheck | null;
};

type MenuSection = {
  title: string;
  icon: LucideIcon;
  items: MenuItem[];
};

const menuSections: MenuSection[] = [
  {
    title: "Overview",
    icon: BarChart3,
    items: [
      {
        title: "Dashboard",
        url: "/",
        icon: BarChart3,
        permission: null, // Dashboard is accessible to all authenticated users
      },
      {
        title: "Reports",
        url: "/reports",
        icon: FileText,
        permission: null, // Reports might be accessible to all users
      },
    ],
  },
  {
    title: "Sales & POS",
    icon: Calculator,
    items: [
      {
        title: "POS Manager",
        url: "/pos-manager",
        icon: Calculator,
        permission: PERMISSIONS.SALES_ORDERS_CREATE, // POS requires sales order creation
      },
      {
        title: "Payments",
        url: "/payments",
        icon: DollarSign,
        permission: PERMISSIONS.PAYMENTS_READ,
      },
    ],
  },
  {
    title: "Catalog",
    icon: FolderTree,
    items: [
      {
        title: "Products",
        url: "/products",
        icon: Package,
        permission: PERMISSIONS.PRODUCTS_READ,
      },
      {
        title: "Categories",
        url: "/categories",
        icon: FolderTree,
        permission: PERMISSIONS.CATEGORIES_READ,
      },
      {
        title: "Brands",
        url: "/brands",
        icon: Tag,
        permission: PERMISSIONS.BRANDS_READ,
      },
      {
        title: "Origins",
        url: "/origins",
        icon: MapPin,
        permission: PERMISSIONS.ORIGINS_READ,
      },
    ],
  },
  {
    title: "Procurement & Inventory",
    icon: Truck,
    items: [
      {
        title: "Suppliers",
        url: "/suppliers",
        icon: Users,
        permission: PERMISSIONS.SUPPLIERS_READ,
      },
      {
        title: "Purchase Orders",
        url: "/purchase-orders",
        icon: ShoppingCart,
        permission: PERMISSIONS.PURCHASE_ORDERS_READ,
      },
      {
        title: "Inventory",
        url: "/inventory",
        icon: Truck,
        permission: PERMISSIONS.INVENTORY_TRACK,
      },
      {
        title: "Distribution",
        url: "/distribution",
        icon: Truck,
        permission: PERMISSIONS.WAREHOUSES_READ,
      },
    ],
  },
  {
    title: "Factory Operations",
    icon: Building2,
    items: [
      {
        title: "Factory Dashboard",
        url: "/factory",
        icon: BarChart3,
        permission: null,
      },
      {
        title: "Customer Orders",
        url: "/factory/customer-orders",
        icon: ShoppingCart,
        permission: null,
      },
      {
        title: "Order Acceptance",
        url: "/factory/orders",
        icon: Package,
        permission: null,
      },
      {
        title: "Work Order Planning",
        url: "/factory/work-orders",
        icon: Calendar,
        permission: null,
      },
      {
        title: "Production Execution",
        url: "/factory/production",
        icon: Activity,
        permission: null,
      },
      {
        title: "Wastage Tracking",
        url: "/factory/wastage",
        icon: AlertTriangle,
        permission: null,
      },
      {
        title: "Factory Expenses",
        url: "/factory/expenses",
        icon: Receipt,
        permission: null,
      },
      {
        title: "Bill of Materials",
        url: "/factory/bom",
        icon: ClipboardList,
        permission: null,
      },
      {
        title: "Material Requirements",
        url: "/factory/mrp",
        icon: TrendingUp,
        permission: null,
      },
      {
        title: "Material Allocation",
        url: "/factory/materials",
        icon: Package2,
        permission: null,
      },
      {
        title: "Material Cost Analysis",
        url: "/factory/material-costs",
        icon: CalculatorIcon,
        permission: null,
      },
      {
        title: "Raw Materials",
        url: "/factory/raw-materials",
        icon: Package,
        permission: null,
      },
    ],
  },
  {
    title: "Finance & Expenses",
    icon: DollarSign,
    items: [
      {
        title: "Expenses",
        url: "/expenses",
        icon: Receipt,
        permission: PERMISSIONS.EXPENSES_READ,
      },
      {
        title: "Account Groups",
        url: "/finance/account-groups",
        icon: Layers,
        permission: PERMISSIONS.ACCOUNT_GROUPS_READ,
      },
      {
        title: "Chart of Accounts",
        url: "/finance/chart-of-accounts",
        icon: GitBranch,
        permission: PERMISSIONS.CHART_OF_ACCOUNTS_READ,
      },
      {
        title: "Cost Centers",
        url: "/finance/cost-centers",
        icon: Building2,
        permission: PERMISSIONS.COST_CENTERS_READ,
      },
      {
        title: "Payment Vouchers",
        url: "/finance/vouchers/payment",
        icon: Wallet,
      permission: PERMISSIONS.VOUCHERS_READ,
      },
      {
        title: "Receipt Vouchers",
        url: "/finance/vouchers/receipt",
        icon: Banknote,
        permission: PERMISSIONS.VOUCHERS_READ,
      },
      {
        title: "Journal Vouchers",
        url: "/finance/vouchers/journal",
        icon: NotebookPen,
        permission: PERMISSIONS.VOUCHERS_READ,
      },
      {
        title: "Balance Transfer",
        url: "/finance/balance-transfer",
        icon: ArrowLeftRight,
        permission: PERMISSIONS.VOUCHERS_READ,
      },
      {
        title: "General Ledger",
        url: "/finance/ledger/general",
        icon: Notebook,
        permission: PERMISSIONS.GENERAL_LEDGER_READ,
      },
      {
        title: "Cost Center Ledger",
        url: "/finance/ledger/cost-centers",
        icon: Building2,
       permission: PERMISSIONS.COST_CENTER_LEDGER_READ,
      },
      {
        title: "Income Statement",
        url: "/finance/statements/income",
        icon: LineChart,
        permission: PERMISSIONS.INCOME_STATEMENT_READ,
      },
      {
        title: "Balance Sheet",
        url: "/finance/statements/balance-sheet",
        icon: Scale,
        permission: PERMISSIONS.BALANCE_SHEET_READ,
      },
    ],
  },
  // {
  //   title: "RBAC Demo",
  //   icon: Shield,
  //   items: [
  //     {
  //       title: "RBAC Demo",
  //       url: "/rbac-demo",
  //       icon: Shield,
  //       permission: null, // Demo accessible to all authenticated users
  //     },
  //   ],
  // },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";
  const { hasPermission, isLoading } = useRBAC();

  const matchesPath = useCallback(
    (path: string) => {
      if (path === "/") return currentPath === "/";
      return currentPath.startsWith(path);
    },
    [currentPath]
  );

  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >(() => {
    const initialState: Record<string, boolean> = {};
    menuSections.forEach((section) => {
      const sectionHasActiveItem = section.items.some((item) =>
        matchesPath(item.url)
      );
      initialState[section.title] = !sectionHasActiveItem;
    });
    return initialState;
  });

  const toggleSection = useCallback((title: string) => {
    setCollapsedSections((previous) => ({
      ...previous,
      [title]: !previous[title],
    }));
  }, []);

  useEffect(() => {
    setCollapsedSections((previous) => {
      let updated = previous;

      menuSections.forEach((section) => {
        const sectionHasActiveItem = section.items.some((item) =>
          matchesPath(item.url)
        );
        if (sectionHasActiveItem && previous[section.title]) {
          if (updated === previous) {
            updated = { ...previous };
          }
          updated[section.title] = false;
        }
      });

      return updated;
    });
  }, [currentPath, matchesPath]);

  const isActive = matchesPath;

  const getNavCls = (path: string) =>
    isActive(path)
      ? "bg-primary text-primary-foreground font-medium"
      : "hover:bg-accent hover:text-accent-foreground";

  // Filter menu items based on user permissions
  const visibleMenuSections = menuSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        // If no permission required, show to all authenticated users
        if (!item.permission) return true;

        // If RBAC is still loading, don't show permission-protected items yet
        if (isLoading) return false;

        // Check if user has the required permission
        return hasPermission(item.permission);
      }),
    }))
    .filter((section) => section.items.length > 0);

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

        {isLoading ? (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <>
                  <SidebarMenuItem>
                    <div className="flex items-center space-x-2 p-2">
                      <div className="w-4 h-4 bg-gray-300 rounded animate-pulse"></div>
                      {!isCollapsed && (
                        <div className="w-20 h-4 bg-gray-300 rounded animate-pulse"></div>
                      )}
                    </div>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <div className="flex items-center space-x-2 p-2">
                      <div className="w-4 h-4 bg-gray-300 rounded animate-pulse"></div>
                      {!isCollapsed && (
                        <div className="w-24 h-4 bg-gray-300 rounded animate-pulse"></div>
                      )}
                    </div>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <div className="flex items-center space-x-2 p-2">
                      <div className="w-4 h-4 bg-gray-300 rounded animate-pulse"></div>
                      {!isCollapsed && (
                        <div className="w-16 h-4 bg-gray-300 rounded animate-pulse"></div>
                      )}
                    </div>
                  </SidebarMenuItem>
                </>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          visibleMenuSections.map((section) => {
            const sectionId = `section-${section.title
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")}`;
            const isSectionCollapsed =
              collapsedSections[section.title] ?? false;
            const hasActiveItem = section.items.some((item) =>
              isActive(item.url)
            );

            return (
              <SidebarGroup key={section.title} className="px-2 py-1">
                <SidebarMenu className="gap-1">
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      data-active={hasActiveItem}
                      className={`text-sidebar-foreground/80 ${
                        isCollapsed
                          ? "justify-center"
                          : "uppercase tracking-[0.12em] text-xs font-semibold"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSection(section.title)}
                        aria-expanded={!isSectionCollapsed}
                        aria-controls={sectionId}
                        className="flex w-full items-center"
                      >
                        <section.icon className="h-4 w-4 shrink-0" />
                        {!isCollapsed && (
                          <>
                            <span className="flex-1">{section.title}</span>
                            <ChevronDown
                              className={`ml-2 h-3.5 w-3.5 text-sidebar-foreground/60 transition-transform ${
                                isSectionCollapsed ? "" : "rotate-180"
                              }`}
                            />
                          </>
                        )}
                      </button>
                    </SidebarMenuButton>
                    {!isSectionCollapsed && (
                      <SidebarMenuSub
                        id={sectionId}
                        className="mt-1 mx-0 border-l-0 pl-3"
                      >
                        {section.items.map((item) => (
                          <SidebarMenuSubItem key={item.title}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isActive(item.url)}
                              className="gap-2"
                            >
                              <NavLink to={item.url}>
                                <span>{item.title}</span>
                              </NavLink>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    )}
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroup>
            );
          })
        )}

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
      
      {/* Module Status Footer */}
      <div className="p-4 border-t">
        <ModuleStatusIndicator showDetails={true} className="w-full justify-center" />
      </div>
    </Sidebar>
  );
}
