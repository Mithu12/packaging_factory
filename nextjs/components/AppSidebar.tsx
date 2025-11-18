'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Package,
  ChevronDown,
  Users,
  ShoppingCart,
  BarChart3,
  Truck,
  DollarSign,
  Settings,
  FolderTree,
  UserCog,
  Tag,
  MapPin,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

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
} from '@/components/ui/sidebar';

type MenuItem = {
  title: string;
  url: string;
  icon: LucideIcon;
};

type MenuSection = {
  title: string;
  icon: LucideIcon;
  items: MenuItem[];
};

const menuSections: MenuSection[] = [
  {
    title: 'Overview',
    icon: BarChart3,
    items: [
      {
        title: 'Dashboard',
        url: '/dashboard',
        icon: BarChart3,
      },
    ],
  },
  {
    title: 'Catalog',
    icon: FolderTree,
    items: [
      {
        title: 'Products',
        url: '/inventory/products',
        icon: Package,
      },
      {
        title: 'Categories',
        url: '/inventory/categories',
        icon: FolderTree,
      },
      {
        title: 'Brands',
        url: '/brands',
        icon: Tag,
      },
      {
        title: 'Origins',
        url: '/origins',
        icon: MapPin,
      },
    ],
  },
  {
    title: 'Procurement & Inventory',
    icon: Truck,
    items: [
      {
        title: 'Suppliers',
        url: '/inventory/suppliers',
        icon: Users,
      },
      {
        title: 'Inventory',
        url: '/inventory',
        icon: Truck,
      },
      {
        title: 'Purchase Orders',
        url: '/purchase-orders',
        icon: ShoppingCart,
      },
      {
        title: 'Payments',
        url: '/payments',
        icon: DollarSign,
      },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const pathname = usePathname();
  const isCollapsed = state === 'collapsed';

  const matchesPath = useCallback(
    (path: string) => {
      if (path === '/dashboard') return pathname === '/dashboard';
      return pathname.startsWith(path);
    },
    [pathname]
  );

  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    const initialState: Record<string, boolean> = {};
    menuSections.forEach((section) => {
      const sectionHasActiveItem = section.items.some((item) => matchesPath(item.url));
      initialState[section.title] = !sectionHasActiveItem;
    });
    return initialState;
  });

  const toggleSection = useCallback((title: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  }, []);

  useEffect(() => {
    setCollapsedSections((prev) => {
      let updated = prev;
      let changed = false;

      menuSections.forEach((section) => {
        const hasActiveItem = section.items.some((item) => matchesPath(item.url));
        if (hasActiveItem && prev[section.title]) {
          if (!changed) {
            updated = { ...prev };
            changed = true;
          }
          updated[section.title] = false;
        }
      });

      return changed ? updated : prev;
    });
  }, [pathname, matchesPath]);

  const isActive = matchesPath;

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarContent>
        <div className="p-4 border-b">
          <h2 className={`font-bold text-lg ${isCollapsed ? 'hidden' : 'block'}`}>ERP</h2>
          {isCollapsed && (
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
              <Package className="w-4 h-4 text-primary-foreground" />
            </div>
          )}
        </div>

        {menuSections.map((section) => {
          const isSectionCollapsed = collapsedSections[section.title] ?? false;
          const hasActiveItem = section.items.some((item) => isActive(item.url));

          return (
            <SidebarGroup key={section.title} className="px-2 py-1">
              <SidebarMenu className="gap-1">
                <SidebarMenuItem>
                  {/* ✅ Fixed: No asChild, no nested button */}
                  <SidebarMenuButton
                    onClick={() => toggleSection(section.title)}
                    data-active={hasActiveItem}
                    className={`text-sidebar-foreground/80 ${isCollapsed
                      ? 'justify-center'
                      : 'uppercase tracking-[0.12em] text-xs font-semibold'
                    }`}
                  >
                    <section.icon className="h-4 w-4 shrink-0" />
                    {!isCollapsed && (
                      <>
                        <span className="flex-1">{section.title}</span>
                        <ChevronDown
                          className={`ml-2 h-3.5 w-3.5 text-sidebar-foreground/60 transition-transform ${isSectionCollapsed ? '' : 'rotate-180'
                          }`}
                        />
                      </>
                    )}
                  </SidebarMenuButton>

                  {!isSectionCollapsed && (
                    <SidebarMenuSub className="mt-1 mx-0 border-l-0 pl-3">
                      {section.items.map((item) => (
                        <SidebarMenuSubItem key={item.title}>
                          {/* ✅ Correct: asChild with Link */}
                          <SidebarMenuSubButton asChild isActive={isActive(item.url)} className="gap-2">
                            <Link href={item.url}>
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  )}
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          );
        })}

        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel className={isCollapsed ? 'hidden' : 'block'}>
            Administration
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/user-management">
                    <UserCog className="h-4 w-4" />
                    {!isCollapsed && <span>User Management</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/settings">
                    <Settings className="h-4 w-4" />
                    {!isCollapsed && <span>Settings</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}