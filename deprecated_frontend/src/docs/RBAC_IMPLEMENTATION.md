# Role-Based Access Control (RBAC) Implementation

## Overview
This document outlines the comprehensive role-based access control system implemented in the ERP frontend application.

## Role Hierarchy
The system implements a 4-tier role hierarchy with increasing permissions:

1. **Viewer** (Level 0) - Read-only access to most modules
2. **Employee** (Level 1) - Can perform basic operations like POS sales and customer management
3. **Manager** (Level 2) - Can create, update, and manage most business entities
4. **Admin** (Level 3) - Full system access including user management and deletions

## Core Components

### 1. RBAC Utility Functions (`/utils/rbac.ts`)
- **`hasPermission(user, module, action)`** - Check if user can perform specific action
- **`hasRole(user, requiredRole)`** - Check if user has specific role or higher
- **`hasAnyRole(user, roles)`** - Check if user has any of the specified roles
- **`getAccessibleModules(user)`** - Get all modules user can access
- **`getModuleActions(user, module)`** - Get all actions user can perform on module

### 2. Role Guard Component (`/components/RoleGuard.tsx`)
A wrapper component that conditionally renders children based on user permissions:
```tsx
<RoleGuard module="products" action="create">
  <Button>Add Product</Button>
</RoleGuard>
```

### 3. Protected Routes (`/App.tsx`)
All routes are protected with role-based access:
```tsx
<Route path="/products" element={
  <ProtectedRoute requiredRole="viewer">
    <DashboardLayout>
      <Products />
    </DashboardLayout>
  </ProtectedRoute>
} />
```

### 4. Navigation Menu (`/components/AppSidebar.tsx`)
Menu items are filtered based on user permissions:
- Only shows modules the user can access
- User Management only visible to admins
- Settings accessible to all authenticated users

## Module Permissions

### Dashboard
- **View**: All roles (viewer, employee, manager, admin)

### POS Management
- **View**: Employee, Manager, Admin
- **Create Sale**: Employee, Manager, Admin
- **Process Payment**: Employee, Manager, Admin
- **View Reports**: Manager, Admin

### Products
- **View**: All roles
- **Create**: Manager, Admin
- **Update**: Manager, Admin
- **Delete**: Admin only
- **Adjust Stock**: Manager, Admin

### Categories
- **View**: All roles
- **Create**: Manager, Admin
- **Update**: Manager, Admin
- **Delete**: Admin only

### Brands
- **View**: All roles
- **Create**: Manager, Admin
- **Update**: Manager, Admin
- **Delete**: Admin only

### Origins
- **View**: All roles
- **Create**: Manager, Admin
- **Update**: Manager, Admin
- **Delete**: Admin only

### Customers
- **View**: All roles
- **Create**: Employee, Manager, Admin
- **Update**: Manager, Admin
- **Delete**: Admin only

### Sales Orders
- **View**: All roles
- **Create**: Employee, Manager, Admin
- **Update**: Manager, Admin
- **Delete**: Admin only

### Purchase Orders
- **View**: All roles
- **Create**: Manager, Admin
- **Update**: Manager, Admin
- **Delete**: Admin only
- **Receive**: Employee, Manager, Admin

### Suppliers
- **View**: All roles
- **Create**: Manager, Admin
- **Update**: Manager, Admin
- **Delete**: Admin only

### Inventory
- **View**: All roles
- **Adjust**: Manager, Admin
- **Reports**: Manager, Admin

### Payments
- **View**: All roles
- **Create**: Manager, Admin
- **Update**: Manager, Admin
- **Delete**: Admin only

### Reports
- **View**: All roles
- **Generate**: Manager, Admin
- **Export**: Manager, Admin

### Settings
- **View**: All roles
- **Update**: Admin only

### User Management
- **View**: Admin only
- **Create**: Admin only
- **Update**: Admin only
- **Delete**: Admin only

## Implementation Examples

### 1. Button Protection
```tsx
<RoleGuard module="products" action="create">
  <Button onClick={() => setShowAddForm(true)}>
    <Plus className="w-4 h-4 mr-2" />
    Add Product
  </Button>
</RoleGuard>
```

### 2. Menu Item Protection
```tsx
<RoleGuard module="users" action="view">
  <SidebarMenuItem>
    <NavLink to="/user-management">
      <UserCog className="h-4 w-4" />
      User Management
    </NavLink>
  </SidebarMenuItem>
</RoleGuard>
```

### 3. Dropdown Menu Actions
```tsx
<DropdownMenuContent>
  <DropdownMenuItem>View Details</DropdownMenuItem>
  <RoleGuard module="products" action="update">
    <DropdownMenuItem>Edit Product</DropdownMenuItem>
  </RoleGuard>
  <RoleGuard module="products" action="delete">
    <DropdownMenuItem className="text-destructive">
      Delete Product
    </DropdownMenuItem>
  </RoleGuard>
</DropdownMenuContent>
```

### 4. Quick Actions
```tsx
<RoleGuard module="purchase_orders" action="create">
  <button onClick={() => handleQuickAction("create-po")}>
    Create Purchase Order
  </button>
</RoleGuard>
```

## Security Features

### 1. Route Protection
- All routes require authentication
- Role-based access control at route level
- Automatic redirect to login for unauthenticated users
- Access denied page for insufficient permissions

### 2. UI Element Protection
- Buttons and actions hidden based on permissions
- Menu items filtered by user role
- Dropdown actions conditionally rendered
- Quick actions role-aware

### 3. Permission Validation
- Client-side permission checks for UI
- Backend API endpoints also protected
- Consistent permission model across frontend and backend

## Usage Guidelines

### 1. Adding New Permissions
1. Update `PERMISSIONS` array in `/utils/rbac.ts`
2. Add new module/action combinations
3. Specify which roles can perform each action

### 2. Protecting New Components
1. Import `RoleGuard` component
2. Wrap UI elements with appropriate permission checks
3. Use `module` and `action` props to specify requirements

### 3. Adding New Routes
1. Wrap route with `ProtectedRoute`
2. Specify `requiredRole` prop
3. Ensure backend API has matching protection

## Testing

### Role Testing Checklist
- [ ] Viewer can view but not modify data
- [ ] Employee can perform POS operations and create customers
- [ ] Manager can create/update most entities but not delete
- [ ] Admin has full access including user management
- [ ] Navigation menu shows appropriate items per role
- [ ] Buttons and actions are hidden/shown correctly
- [ ] Route access is properly restricted

### Test Users
- **Admin**: admin / admin123 (full access)
- **Manager**: manager / manager123 (management access)
- **Employee**: employee / employee123 (operational access)
- **Viewer**: viewer / viewer123 (read-only access)

## Benefits

1. **Security**: Prevents unauthorized access to sensitive operations
2. **User Experience**: Clean interface showing only relevant options
3. **Compliance**: Meets enterprise security requirements
4. **Scalability**: Easy to add new roles and permissions
5. **Maintainability**: Centralized permission management

## Future Enhancements

1. **Dynamic Permissions**: Load permissions from backend
2. **Permission Groups**: Group related permissions
3. **Time-based Access**: Temporary permission grants
4. **Audit Logging**: Track permission usage
5. **Permission Inheritance**: Role-based permission inheritance
