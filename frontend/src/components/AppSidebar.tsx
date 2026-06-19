"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  Printer,
  GitBranch,
  Building,
  Building2,
  Wallet,
  Banknote,
  NotebookPen,
  ArrowLeftRight,
  RotateCcw,
  Landmark,
  Notebook,
  LineChart,
  Scale,
  Shield,
  Calendar,
  Activity,
  AlertTriangle,
  Clock,
  Wrench,
  ClipboardList,
  TrendingUp,
  Package2,
  Calculator as CalculatorIcon,
  FileSpreadsheet,
  UserCheck,
  User,
  CreditCard,
  Bell,
  Database,
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
import { ModuleStatusIndicator } from "@/components/ModuleStatusIndicator";
import { PERMISSIONS, type PermissionCheck } from "@/types/rbac";
import { SettingsApi } from "@/services/settings-api";
import { ApiService, type Category, type Subcategory } from "@/services/api";
import { displayPrimaryCategoryLabel } from "@/modules/inventory/constants/inventoryProductCategories";

type MenuItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  permission: PermissionCheck | null;
};

// A named cluster of items rendered as a collapsible subsection inside a section.
type MenuGroup = {
  title: string;
  items: MenuItem[];
};

type MenuSection = {
  title: string;
  icon: LucideIcon;
  // A section renders either a flat list of items or a set of named subgroups.
  items?: MenuItem[];
  groups?: MenuGroup[];
};

// All leaf items of a section, regardless of whether it uses flat items or groups.
const sectionItems = (section: MenuSection): MenuItem[] => [
  ...(section.items ?? []),
  ...(section.groups ?? []).flatMap((group) => group.items),
];

const menuSections: MenuSection[] = [
  {
    title: "Overview",
    icon: BarChart3,
    items: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: BarChart3,
        permission: PERMISSIONS.FACTORY_DASHBOARD_READ,
      },
    ],
  },
  // {
  //   title: "Sales Rep",
  //   icon: User,
  //   items: [
  //     {
  //       title: "Dashboard",
  //       url: "/sr/dashboard",
  //       icon: BarChart3,
  //       permission: PERMISSIONS.SALES_REP_DASHBOARD_READ,
  //     },
  //     {
  //       title: "Customers",
  //       url: "/sr/customers",
  //       icon: Users,
  //       permission: PERMISSIONS.SALES_REP_CUSTOMERS_READ,
  //     },
  //     {
  //       title: "Orders",
  //       url: "/sr/orders",
  //       icon: ShoppingCart,
  //       permission: PERMISSIONS.SALES_REP_ORDERS_READ,
  //     },
  //     {
  //       title: "Invoices & Payments",
  //       url: "/sr/invoices",
  //       icon: FileText,
  //       permission: PERMISSIONS.SALES_REP_INVOICES_READ,
  //     },
  //     {
  //       title: "Payments",
  //       url: "/sr/payments",
  //       icon: CreditCard,
  //       permission: PERMISSIONS.SALES_REP_PAYMENTS_READ,
  //     },
  //     {
  //       title: "Deliveries",
  //       url: "/sr/deliveries",
  //       icon: Truck,
  //       permission: PERMISSIONS.SALES_REP_DELIVERIES_READ,
  //     },
  //     {
  //       title: "Reports",
  //       url: "/sr/reports",
  //       icon: BarChart3,
  //       permission: PERMISSIONS.SALES_REP_REPORTS_READ,
  //     },
  //     {
  //       title: "Notifications",
  //       url: "/sr/notifications",
  //       icon: Bell,
  //       permission: PERMISSIONS.SALES_REP_NOTIFICATIONS_READ,
  //     },
  //   ],
  // },
  {
    title: "Catalog",
    icon: FolderTree,
    items: [
      {
        title: "Products",
        url: "/inventory/products",
        icon: Package,
        permission: PERMISSIONS.PRODUCTS_READ,
      },
      {
        title: "Categories",
        url: "/inventory/categories",
        icon: FolderTree,
        permission: PERMISSIONS.CATEGORIES_READ,
      },
      // {
      //   title: "Brands",
      //   url: "/inventory/brands",
      //   icon: Tag,
      //   permission: PERMISSIONS.BRANDS_READ,
      // },
      // {
      //   title: "Origins",
      //   url: "/inventory/origins",
      //   icon: MapPin,
      //   permission: PERMISSIONS.ORIGINS_READ,
      // },
    ],
  },
  {
    title: "Procurement & Inventory",
    icon: Truck,
    items: [
      {
        title: "Suppliers",
        url: "/inventory/suppliers",
        icon: Users,
        permission: PERMISSIONS.SUPPLIERS_READ,
      },
      {
        title: "Inventory",
        url: "/inventory",
        icon: Truck,
        permission: PERMISSIONS.INVENTORY_TRACK,
      },
      {
        title: "Purchase Orders",
        url: "/inventory/purchase-orders",
        icon: ShoppingCart,
        permission: PERMISSIONS.PURCHASE_ORDERS_READ,
      },
      {
        title: "Purchase Returns",
        url: "/inventory/purchase-returns",
        icon: ArrowLeftRight,
        permission: PERMISSIONS.PURCHASE_RETURNS_READ,
      },
      {
        title: "Stock Adjustment",
        url: "/inventory/stock-adjustments/bulk",
        icon: Layers,
        permission: PERMISSIONS.STOCK_ADJUSTMENTS_CREATE,
      },
      {
        title: "Supplier Payments",
        url: "/inventory/payments",
        icon: DollarSign,
        permission: PERMISSIONS.PAYMENTS_READ,
      },
      {
        title: "Warehouse",
        url: "/inventory/distribution",
        icon: Truck,
        permission: PERMISSIONS.WAREHOUSES_READ,
      },
    ],
  },
  {
    title: "Factory Operations",
    icon: Building2,
    groups: [
      {
        title: "Overview",
        items: [
          {
            title: "Order Dashboard",
            url: "/factory",
            icon: BarChart3,
            permission: PERMISSIONS.FACTORY_DASHBOARD_READ,
          },
        ],
      },
      {
        title: "Sales & Billing",
        items: [
          {
            title: "Customer Management",
            url: "/factory/customers",
            icon: Users,
            permission: PERMISSIONS.FACTORY_CUSTOMERS_READ,
          },
          {
            title: "Company Orders & Quotation",
            url: "/factory/customer-orders",
            icon: ShoppingCart,
            permission: PERMISSIONS.FACTORY_ORDERS_READ,
          },
          {
            title: "Sales Invoices",
            url: "/factory/sales-invoices",
            icon: FileText,
            permission: PERMISSIONS.FACTORY_SALES_INVOICES_READ,
          },
          {
            title: "Delivery Challan & Invoice",
            url: "/factory/deliveries",
            icon: Truck,
            permission: PERMISSIONS.FACTORY_ORDERS_READ,
          },
          {
            title: "Delivery Returns",
            url: "/factory/delivery-returns",
            icon: RotateCcw,
            permission: PERMISSIONS.FACTORY_ORDERS_READ,
          },
          {
            title: "Monthly Invoice",
            url: "/factory/monthly-bills",
            icon: Receipt,
            permission: PERMISSIONS.FACTORY_ORDERS_READ,
          },
          {
            title: "Customer Payments",
            url: "/factory/payments",
            icon: Wallet,
            permission: PERMISSIONS.FACTORY_ORDERS_READ,
          },
        ],
      },
      {
        title: "Bill of Materials",
        items: [
          {
            title: "All BOMs",
            url: "/factory/bom",
            icon: ClipboardList,
            permission: PERMISSIONS.FACTORY_BOMS_READ,
          },
          {
            title: "Corrugation",
            url: "/factory/bom/corrugation",
            icon: Layers,
            permission: PERMISSIONS.FACTORY_BOMS_READ,
          },
          {
            title: "Printing",
            url: "/factory/bom/printing",
            icon: Printer,
            permission: PERMISSIONS.FACTORY_BOMS_READ,
          },
          {
            title: "Ready Goods",
            url: "/factory/bom/ready-goods",
            icon: Package2,
            permission: PERMISSIONS.FACTORY_BOMS_READ,
          },
        ],
      },
      {
        title: "Production",
        items: [
          {
            title: "Order Acceptance",
            url: "/factory/orders",
            icon: Package,
            permission: PERMISSIONS.FACTORY_ORDER_ACCEPTANCE_READ,
          },
          {
            title: "Work Order Planning",
            url: "/factory/work-orders",
            icon: Calendar,
            permission: PERMISSIONS.FACTORY_WORK_ORDERS_READ,
          },
          {
            title: "Finished Goods",
            url: "/factory/work-orders/finished-goods",
            icon: Package,
            permission: PERMISSIONS.FACTORY_WORK_ORDERS_READ,
          },
          // Hidden — Pre-Production (RRM) is not in use; keep for future re-enable.
          // {
          //   title: "Pre-Production (RRM)",
          //   url: "/factory/work-orders/pre-production",
          //   icon: Wrench,
          //   permission: PERMISSIONS.FACTORY_WORK_ORDERS_READ,
          // },
          {
            title: "Manual Pre-Production",
            url: "/factory/work-orders/manual-pre-production",
            icon: Wrench,
            permission: PERMISSIONS.FACTORY_WORK_ORDERS_READ,
          },
          {
            title: "Production Execution",
            url: "/factory/production",
            icon: Activity,
            permission: PERMISSIONS.FACTORY_PRODUCTION_RUNS_READ,
          },
          {
            title: "Wastage Tracking",
            url: "/factory/wastage",
            icon: AlertTriangle,
            permission: PERMISSIONS.FACTORY_WASTAGE_READ,
          },
        ],
      },
      {
        title: "Materials",
        items: [
          {
            title: "Material Requirements",
            url: "/factory/mrp",
            icon: TrendingUp,
            permission: PERMISSIONS.FACTORY_MRP_READ,
          },
          {
            title: "Material Allocation",
            url: "/factory/materials",
            icon: Package2,
            permission: PERMISSIONS.FACTORY_MATERIAL_ALLOCATIONS_READ,
          },
          {
            title: "Material Consumption",
            url: "/factory/material-consumption",
            icon: Activity,
            permission: PERMISSIONS.FACTORY_MATERIAL_CONSUMPTIONS_READ,
          },
        ],
      },
      {
        title: "Costing & Expenses",
        items: [
          {
            title: "Factory Expenses",
            url: "/factory/expenses",
            icon: Receipt,
            permission: PERMISSIONS.FACTORY_EXPENSES_READ,
          },
          {
            title: "Material Cost Analysis",
            url: "/factory/material-costs",
            icon: CalculatorIcon,
            permission: PERMISSIONS.FACTORY_MATERIAL_COSTS_READ,
          },
          {
            title: "Packaging Costing",
            url: "/factory/costing",
            icon: FileSpreadsheet,
            permission: PERMISSIONS.FACTORY_MATERIAL_COSTS_READ,
          },
        ],
      },
      {
        title: "Equipment & Maintenance",
        items: [
          {
            title: "Production Lines",
            url: "/factory/production-lines",
            icon: Settings,
            permission: PERMISSIONS.FACTORY_PRODUCTION_LINES_READ,
          },
          {
            title: "Machines",
            url: "/factory/machines",
            icon: Wrench,
            permission: PERMISSIONS.FACTORY_MACHINES_READ,
          },
          {
            title: "Spare Parts",
            url: "/factory/parts",
            icon: Package2,
            permission: PERMISSIONS.FACTORY_MACHINES_READ,
          },
          {
            title: "Plates",
            url: "/factory/plates",
            icon: Printer,
            permission: PERMISSIONS.FACTORY_PLATES_READ,
          },
        ],
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
        url: "/accounts/account-groups",
        icon: Layers,
        permission: PERMISSIONS.ACCOUNT_GROUPS_READ,
      },
      {
        title: "Chart of Accounts",
        url: "/accounts/chart-of-accounts",
        icon: GitBranch,
        permission: PERMISSIONS.CHART_OF_ACCOUNTS_READ,
      },
      {
        title: "Cost Centers",
        url: "/accounts/cost-centers",
        icon: Building2,
        permission: PERMISSIONS.COST_CENTERS_READ,
      },
      {
        title: "Payment Vouchers",
        url: "/accounts/payment-vouchers",
        icon: Wallet,
        permission: PERMISSIONS.VOUCHERS_READ,
      },
      {
        title: "Receipt Vouchers",
        url: "/accounts/receipt-vouchers",
        icon: Banknote,
        permission: PERMISSIONS.VOUCHERS_READ,
      },
      {
        title: "Journal Vouchers",
        url: "/accounts/journal-vouchers",
        icon: NotebookPen,
        permission: PERMISSIONS.VOUCHERS_READ,
      },
      {
        title: "Balance Transfer",
        url: "/accounts/balance-transfer",
        icon: ArrowLeftRight,
        permission: PERMISSIONS.VOUCHERS_READ,
      },
      {
        title: "Cheque Register",
        url: "/accounts/cheque-register",
        icon: CreditCard,
        permission: PERMISSIONS.VOUCHERS_READ,
      },
      {
        title: "Bank Reconciliation",
        url: "/accounts/bank-reconciliation",
        icon: Landmark,
        permission: PERMISSIONS.VOUCHERS_READ,
      },
      {
        title: "General Ledger",
        url: "/accounts/general-ledger",
        icon: Notebook,
        permission: PERMISSIONS.GENERAL_LEDGER_READ,
      },
      {
        title: "Cost Center Ledger",
        url: "/accounts/cost-center-ledger",
        icon: Building2,
        permission: PERMISSIONS.COST_CENTER_LEDGER_READ,
      },
      {
        title: "Voucher Failures",
        url: "/accounts/voucher-failures",
        icon: AlertTriangle,
        permission: PERMISSIONS.VOUCHERS_READ,
      },
      // {
      //   title: "DC Accounts",
      //   url: "/accounts/dc-wise",
      //   icon: Building2,
      //   permission: PERMISSIONS.BALANCE_SHEET_READ,
      // },
      {
        title: "Income Statement",
        url: "/accounts/income-statement",
        icon: LineChart,
        permission: PERMISSIONS.INCOME_STATEMENT_READ,
      },
      {
        title: "Balance Sheet",
        url: "/accounts/balance-sheet",
        icon: Scale,
        permission: PERMISSIONS.BALANCE_SHEET_READ,
      },
      {
        title: "VAT Register",
        url: "/accounts/vat-register",
        icon: Receipt,
        permission: PERMISSIONS.INCOME_STATEMENT_READ,
      },
    ],
  },
  {
    title: "Human Resources",
    icon: UserCog,
    items: [
      {
        title: "HR Dashboard",
        url: "/hrm",
        icon: BarChart3,
        permission: PERMISSIONS.HR_DASHBOARD_READ,
      },
      {
        title: "Employees",
        url: "/hrm/employees",
        icon: Users,
        permission: PERMISSIONS.HR_EMPLOYEES_READ,
      },
      {
        title: "Departments",
        url: "/hrm/departments",
        icon: Building,
        permission: PERMISSIONS.HR_DEPARTMENTS_READ,
      },
      {
        title: "Designations",
        url: "/hrm/designations",
        icon: UserCheck,
        permission: PERMISSIONS.HR_DESIGNATIONS_READ,
      },
      {
        title: "Salary Updates",
        url: "/hrm/salary-updates",
        icon: TrendingUp,
        permission: PERMISSIONS.HR_PAYROLL_READ,
      },
      {
        title: "Payroll",
        url: "/hrm/payroll",
        icon: Receipt,
        permission: PERMISSIONS.HR_PAYROLL_READ,
      },
      {
        title: "Advance Salary",
        url: "/hrm/advance-salary",
        icon: Banknote,
        permission: PERMISSIONS.HR_PAYROLL_READ,
      },
      {
        title: "Leave Types",
        url: "/hrm/leave-types",
        icon: Calendar,
        permission: PERMISSIONS.HR_LEAVE_READ,
      },
      {
        title: "Leave Applications",
        url: "/hrm/leave-application",
        icon: FileText,
        permission: PERMISSIONS.HR_LEAVE_READ,
      },
      {
        title: "Leave Calendar",
        url: "/hrm/leave-calendar",
        icon: Calendar,
        permission: PERMISSIONS.HR_LEAVE_READ,
      },
      {
        title: "Attendance Dashboard",
        url: "/hrm/attendance",
        icon: Clock,
        permission: PERMISSIONS.HR_ATTENDANCE_READ,
      },
      {
        title: "Mark Attendance",
        url: "/hrm/attendance-marking",
        icon: Calendar,
        permission: PERMISSIONS.HR_ATTENDANCE_CREATE,
      },
      {
        title: "Shift Management",
        url: "/hrm/shifts",
        icon: Activity,
        permission: PERMISSIONS.HR_ATTENDANCE_MANAGE,
      },
      {
        title: "Attendance Regularization",
        url: "/hrm/attendance-regularization",
        icon: FileText,
        permission: PERMISSIONS.HR_ATTENDANCE_READ,
      },
      {
        title: "Attendance Reports",
        url: "/hrm/attendance-reports",
        icon: BarChart3,
        permission: PERMISSIONS.HR_REPORTS_READ,
      },
    ],
  },
  {
    title: "Reports",
    icon: FileText,
    items: [
      {
        title: "Purchase Reports",
        url: "/reports/purchase-reports",
        icon: ShoppingCart,
        permission: PERMISSIONS.PURCHASE_ORDERS_READ,
      },
      {
        title: "Expense Reports",
        url: "/reports/expense-reports",
        icon: Receipt,
        permission: PERMISSIONS.EXPENSES_READ,
      },
      {
        title: "Supplier Payments",
        url: "/reports/supplier-payments-reports",
        icon: DollarSign,
        permission: PERMISSIONS.PAYMENTS_READ,
      },
      {
        title: "Supplier Due Report",
        url: "/reports/supplier-due-reports",
        icon: Wallet,
        permission: PERMISSIONS.SUPPLIERS_READ,
      },
      {
        title: "Stock vs Order Demand",
        url: "/reports/stock-vs-order-demand",
        icon: Package,
        permission: PERMISSIONS.FACTORY_ORDERS_READ,
      },
      {
        title: "Customer Payment Reminders",
        url: "/reports/customer-payment-reminders",
        icon: DollarSign,
        permission: PERMISSIONS.PAYMENTS_READ,
      },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const pathname = usePathname();
  const currentPath = pathname;
  const isCollapsed = state === "collapsed";
  const { hasPermission, isLoading } = useRBAC();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [systemName, setSystemName] = useState<string>("ERP SYSTEM");

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const companySettings = await SettingsApi.getCompanySettings();
        
        // Handle Logo
        if (companySettings.system_logo) {
          const apiUrl = process.env.NEXT_PUBLIC_BACKEND_BASE_URL || 'http://localhost:9000';
          const fullUrl = companySettings.system_logo.startsWith('http') 
            ? companySettings.system_logo 
            : `${apiUrl}${companySettings.system_logo}`;
          setLogoUrl(fullUrl);
        }

        // Handle System Name
        if (companySettings.company_name) {
          setSystemName(companySettings.company_name);
        }
      } catch (error) {
        // Silently fail, fallback will be used
      }
    };
    fetchSettings();
  }, []);

  // Live catalog tree for the sidebar: fixed categories (ordered by sort_order)
  // with their subcategories, each linking to a pre-filtered Products page.
  const [catalogCategories, setCatalogCategories] = useState<Category[]>([]);
  const [catalogSubcategories, setCatalogSubcategories] = useState<Subcategory[]>([]);

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const [catRes, subRes] = await Promise.all([
          ApiService.getCategories({ limit: 100, primary_product_types_only: true }),
          ApiService.getSubcategories({ limit: 1000 }),
        ]);
        setCatalogCategories(catRes.categories);
        setCatalogSubcategories(subRes.subcategories);
      } catch {
        // Silently fall back to the static catalog links.
      }
    };
    fetchCatalog();
  }, []);

  // Replace the static "Catalog" section's children with a "Manage" group
  // (Products / Categories) followed by one collapsible group per category,
  // whose items are subcategories that deep-link into the filtered Products page.
  const sections = useMemo<MenuSection[]>(() => {
    if (catalogCategories.length === 0) return menuSections;
    const subsByCategory = catalogSubcategories.reduce((acc, sub) => {
      (acc[sub.category_id] ??= []).push(sub);
      return acc;
    }, {} as Record<number, Subcategory[]>);

    return menuSections.map((section) => {
      if (section.title !== "Catalog") return section;
      const manageGroup: MenuGroup = { title: "Manage", items: section.items ?? [] };
      const categoryGroups: MenuGroup[] = catalogCategories.map((category) => ({
        title: displayPrimaryCategoryLabel(category.name),
        items: (subsByCategory[category.id] ?? []).map((sub) => ({
          title: sub.name,
          url: `/inventory/products?category=${encodeURIComponent(
            category.name,
          )}&subcategory=${encodeURIComponent(sub.name)}`,
          icon: Tag,
          permission: PERMISSIONS.PRODUCTS_READ,
        })),
      }));
      return {
        ...section,
        items: undefined,
        groups: [manageGroup, ...categoryGroups.filter((g) => g.items.length > 0)],
      };
    });
  }, [catalogCategories, catalogSubcategories]);

  const matchesPath = useCallback(
    (path: string) => {
      if (path === "/dashboard")
        return currentPath === "/dashboard" || currentPath === "/";
      return currentPath.startsWith(path);
    },
    [currentPath],
  );

  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >(() => {
    const initialState: Record<string, boolean> = {};
    menuSections.forEach((section) => {
      const sectionHasActiveItem = sectionItems(section).some((item) =>
        matchesPath(item.url),
      );
      initialState[section.title] = !sectionHasActiveItem;
    });
    return initialState;
  });

  // Per-subgroup collapse state, keyed by `${sectionTitle}::${groupTitle}`.
  const groupKey = (sectionTitle: string, groupTitle: string) =>
    `${sectionTitle}::${groupTitle}`;

  const [collapsedGroups, setCollapsedGroups] = useState<
    Record<string, boolean>
  >(() => {
    const initialState: Record<string, boolean> = {};
    menuSections.forEach((section) => {
      (section.groups ?? []).forEach((group) => {
        const groupHasActiveItem = group.items.some((item) =>
          matchesPath(item.url),
        );
        initialState[groupKey(section.title, group.title)] = !groupHasActiveItem;
      });
    });
    return initialState;
  });

  const toggleSection = useCallback((title: string) => {
    setCollapsedSections((previous) => ({
      ...previous,
      [title]: !previous[title],
    }));
  }, []);

  const toggleGroup = useCallback((key: string) => {
    setCollapsedGroups((previous) => ({
      ...previous,
      [key]: !previous[key],
    }));
  }, []);

  useEffect(() => {
    setCollapsedSections((previous) => {
      let updated = previous;

      menuSections.forEach((section) => {
        const sectionHasActiveItem = sectionItems(section).some((item) =>
          matchesPath(item.url),
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

    // Auto-open the subgroup that contains the active route.
    setCollapsedGroups((previous) => {
      let updated = previous;
      menuSections.forEach((section) => {
        (section.groups ?? []).forEach((group) => {
          const key = groupKey(section.title, group.title);
          const groupHasActiveItem = group.items.some((item) =>
            matchesPath(item.url),
          );
          if (groupHasActiveItem && previous[key]) {
            if (updated === previous) {
              updated = { ...previous };
            }
            updated[key] = false;
          }
        });
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
  const canSeeItem = (item: MenuItem) => {
    // If no permission required, show to all authenticated users
    if (!item.permission) return true;
    // If RBAC is still loading, don't show permission-protected items yet
    if (isLoading) return false;
    // Check if user has the required permission
    return hasPermission(item.permission);
  };

  const visibleMenuSections = sections
    .map((section) => ({
      ...section,
      items: (section.items ?? []).filter(canSeeItem),
      groups: (section.groups ?? [])
        .map((group) => ({
          ...group,
          items: group.items.filter(canSeeItem),
        }))
        .filter((group) => group.items.length > 0),
    }))
    .filter(
      (section) => section.items.length > 0 || section.groups.length > 0,
    );

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4 border-b flex items-center gap-3 min-h-[65px]">
          <div className="flex-shrink-0">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-8 h-8 object-contain" />
            ) : (
              <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
                <Package className="w-4 h-4 text-primary-foreground" />
              </div>
            )}
          </div>
          {!isCollapsed && (
            <h2 className="font-bold text-lg truncate uppercase">
              {systemName}
            </h2>
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
            const allItems = [
              ...section.items,
              ...section.groups.flatMap((group) => group.items),
            ];
            const hasActiveItem = allItems.some((item) => isActive(item.url));
            // Subgroups only make sense in the expanded rail; the icon rail
            // flattens them so items stay reachable.
            const useGroups = section.groups.length > 0 && !isCollapsed;

            const renderSubItem = (item: MenuItem) => (
              <SidebarMenuSubItem key={item.title}>
                <SidebarMenuSubButton
                  asChild
                  isActive={isActive(item.url)}
                  className="gap-2"
                >
                  <Link href={item.url}>
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
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
                    {!isSectionCollapsed &&
                      (useGroups ? (
                        <div id={sectionId} className="mt-1 space-y-0.5">
                          {section.groups.map((group) => {
                            const key = groupKey(section.title, group.title);
                            const isGroupCollapsed =
                              collapsedGroups[key] ?? false;
                            const groupHasActiveItem = group.items.some((item) =>
                              isActive(item.url),
                            );
                            return (
                              <div key={group.title}>
                                <button
                                  type="button"
                                  onClick={() => toggleGroup(key)}
                                  aria-expanded={!isGroupCollapsed}
                                  data-active={groupHasActiveItem}
                                  className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-[0.7rem] font-medium uppercase tracking-wide text-sidebar-foreground/55 hover:text-sidebar-foreground"
                                >
                                  <span className="flex-1 text-left">
                                    {group.title}
                                  </span>
                                  <ChevronDown
                                    className={`h-3 w-3 transition-transform ${
                                      isGroupCollapsed ? "" : "rotate-180"
                                    }`}
                                  />
                                </button>
                                {!isGroupCollapsed && (
                                  <SidebarMenuSub className="mt-0.5 mx-0 border-l border-sidebar-border/60 pl-3">
                                    {group.items.map(renderSubItem)}
                                  </SidebarMenuSub>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <SidebarMenuSub
                          id={sectionId}
                          className="mt-1 mx-0 border-l-0 pl-3"
                        >
                          {allItems.map(renderSubItem)}
                        </SidebarMenuSub>
                      ))}
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
                    <Link
                      href="/user-management"
                      className={getNavCls("/user-management")}
                    >
                      <UserCog className="h-4 w-4" />
                      {!isCollapsed && <span>User Management</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </PermissionGuard>

              <SystemAdminGuard>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/rbac" className={getNavCls("/rbac")}>
                      <Shield className="h-4 w-4" />
                      {!isCollapsed && <span>RBAC Management</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SystemAdminGuard>

              <PermissionGuard permission={PERMISSIONS.SETTINGS_READ}>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/settings" className={getNavCls("/settings")}>
                      <Settings className="h-4 w-4" />
                      {!isCollapsed && <span>Settings</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </PermissionGuard>

              <PermissionGuard permission={PERMISSIONS.SYSTEM_BACKUP}>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link
                      href="/settings/backup"
                      className={getNavCls("/settings/backup")}
                    >
                      <Database className="h-4 w-4" />
                      {!isCollapsed && <span>DB Backup</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </PermissionGuard>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Module Status Footer */}
      <div className="p-4 border-t">
        <ModuleStatusIndicator
          showDetails={true}
          className="w-full justify-center"
        />
      </div>
    </Sidebar>
  );
}
