import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  UserPlus,
  Edit,
  Trash2,
  Shield,
  Mail,
  Phone,
  Calendar,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AuthApi } from "@/services/auth-api";
import { User as BackendUser } from "@/services/auth-api";
import { RBACApi } from "@/services/rbac-api";
import { Role, UserWithPermissions } from "@/types/rbac";
import { useFormatting } from "@/hooks/useFormatting";
import { useAuth } from "@/contexts/AuthContext";
import { useRBAC } from "@/contexts/RBACContext";
import { PermissionGuard } from "@/components/rbac/PermissionGuard";
import { PermissionButton } from "@/components/rbac/PermissionButton";
import { PERMISSIONS } from "@/types/rbac";

const userSchema = z.object({
  username: z.string().min(2, "Username must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  full_name: z.string().min(2, "Full name must be at least 2 characters"),
  mobile_number: z.string().optional(),
  departments: z.array(z.string()).optional(),
  role_id: z.number().min(1, "Please select a role"),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
});

type UserFormData = z.infer<typeof userSchema>;

// Use RBAC-compatible user type
type User = UserWithPermissions;

const UserManagement = () => {
  const { toast } = useToast();
  const { formatDate } = useFormatting();
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const { hasPermission, isSystemAdmin } = useRBAC();

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username: "",
      email: "",
      full_name: "",
      mobile_number: "",
      departments: [],
      role_id: 0,
      password: "",
    },
  });

  // Fetch users and roles from backend
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading users and roles with RBAC data...');
      
      const [usersData, rolesData] = await Promise.all([
        RBACApi.getAllUsersWithRBAC(),
        RBACApi.getAllRoles({ limit: 100 })
      ]);
      
      console.log('Users data:', usersData);
      console.log('Roles data:', rolesData);
      
      setUsers(usersData || []);
      setRoles(rolesData?.roles || []);
    } catch (err) {
      console.error('Failed to fetch users and roles:', err);
      setError('Failed to load users and roles. Please try again.');
      
      // Set empty arrays as fallback
      setUsers([]);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);



  const departments = [
    { value: "it", label: "IT" },
    { value: "sales", label: "Sales" },
    { value: "inventory", label: "Inventory" },
    { value: "finance", label: "Finance" },
    { value: "hr", label: "Human Resources" },
    { value: "operations", label: "Operations" },
    { value: "marketing", label: "Marketing" },
  ];

  const onSubmit = async (data: UserFormData) => {
    try {
      setSubmitting(true);
      console.log('Submitting user data:', data);

      if (selectedUser) {
        // Update existing user with RBAC
        const updatedUser = await RBACApi.updateUserWithRole(selectedUser.id, {
          username: data.username,
          email: data.email,
          full_name: data.full_name,
          mobile_number: data.mobile_number,
          departments: data.departments,
          role_id: data.role_id,
        });

        setUsers(users.map(user => user.id === selectedUser.id ? updatedUser : user));
        toast({
          title: "User updated",
          description: `${data.full_name} has been updated successfully.`,
        });
      } else {
        // Create new user with RBAC role
        if (!data.password) {
          throw new Error('Password is required for new users');
        }

        const newUser = await RBACApi.createUserWithRole({
          username: data.username,
          email: data.email,
          full_name: data.full_name,
          mobile_number: data.mobile_number,
          departments: data.departments,
          role_id: data.role_id,
          password: data.password,
        });

        setUsers([...users, newUser]);
        toast({
          title: "User created",
          description: `${data.full_name} has been added successfully.`,
        });
      }

      setIsAddUserOpen(false);
      setSelectedUser(null);
      form.reset();
    } catch (err: any) {
      console.error('Failed to save user:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to save user. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    form.setValue("username", user.username);
    form.setValue("email", user.email);
    form.setValue("full_name", user.full_name);
    form.setValue("mobile_number", user.mobile_number || "");
    form.setValue("departments", user.departments || []);
    form.setValue("role_id", user.role_id || 0);
    form.setValue("password", undefined); // Don't pre-fill password
    setIsAddUserOpen(true);
  };

  const handleDeleteUser = async (userId: number) => {
    try {
      if (userId === user?.id) {
        toast({
          title: "Error",
          description: "You cannot delete your own account.",
          variant: "destructive",
        });
        return;
      }
      await AuthApi.deactivateUser(userId);
      // Update user status instead of removing from list (soft delete)
      setUsers(users.map(user => user.id === userId ? { ...user, is_active: false } : user));
      toast({
        title: "User deactivated",
        description: "User has been deactivated successfully.",
      });
    } catch (err: any) {
      console.error('Failed to deactivate user:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to deactivate user. Please try again.",
        variant: "destructive",
      });
    }
  };

  const toggleUserStatus = async (userId: number) => {
    try {
      if (user?.id === userId) {
        toast({
          title: "Error",
          description: "You cannot change your own status.",
          variant: "destructive",
        });
        return;
      }
      const selectedUser = users.find(u => u.id === userId);
      if (!selectedUser) {
        toast({
          title: "Error",
          description: "User not found.",
          variant: "destructive",
        });
        return;
      }

      if (selectedUser.is_active) {
        await AuthApi.deactivateUser(userId);
        setUsers(users.map(u => u.id === userId ? { ...u, is_active: false } : u));
        toast({
          title: "User deactivated",
          description: "User has been deactivated successfully.",
        });
      } else {
        const reactivatedUser = await AuthApi.reactivateUser(userId);
        setUsers(users.map(u => u.id === userId ? reactivatedUser as UserWithPermissions : u));
        toast({
          title: "User reactivated",
          description: "User has been reactivated successfully.",
        });
      }
    } catch (err: any) {
      console.error('Failed to toggle user status:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to update user status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getRoleBadgeVariant = (
    roleName: string
  ): "default" | "destructive" | "secondary" | "outline" => {
    // Map role names to badge variants
    const roleVariants: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
      'system_admin': 'destructive',
      'executive': 'destructive',
      'finance_manager': 'secondary',
      'finance_staff': 'default',
      'hr_manager': 'secondary',
      'employee': 'outline',
      'sales_manager': 'secondary',
      'sales_executive': 'default',
    };
    
    return roleVariants[roleName.toLowerCase()] || "outline";
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">
            Manage users, assign roles, and control access permissions
          </p>
        </div>

        <PermissionGuard permission={PERMISSIONS.USERS_CREATE}>
          <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                Add User
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {selectedUser ? "Edit User" : "Add New User"}
              </DialogTitle>
              <DialogDescription>
                {selectedUser
                  ? "Update user information and role assignments."
                  : "Create a new user account and assign roles."}
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="johndoe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="john.doe@company.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mobile_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobile Number</FormLabel>
                      <FormControl>
                        <Input placeholder="+1234567890" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="departments"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Departments</FormLabel>
                      <div className="space-y-2">
                        {departments.map((dept) => (
                          <div
                            key={dept.value}
                            className="flex items-center space-x-2"
                          >
                            <input
                              type="checkbox"
                              id={dept.value}
                              checked={
                                field.value?.includes(dept.value) || false
                              }
                              onChange={(e) => {
                                const currentValue = field.value || [];
                                if (e.target.checked) {
                                  field.onChange([
                                    ...currentValue,
                                    dept.value,
                                  ]);
                                } else {
                                  field.onChange(
                                    currentValue.filter(
                                      (v) => v !== dept.value
                                    )
                                  );
                                }
                              }}
                              className="rounded border-gray-300"
                            />
                            <label htmlFor={dept.value} className="text-sm">
                              {dept.label}
                            </label>
                          </div>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {!selectedUser && (
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Enter password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="role_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem key={role.id} value={role.id.toString()}>
                              <div className="flex items-center gap-2">
                                <span>{role.display_name}</span>
                                {role.department && (
                                  <Badge variant="outline" className="text-xs">
                                    {role.department}
                                  </Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsAddUserOpen(false);
                      setSelectedUser(null);
                      form.reset();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {selectedUser ? "Update User" : "Create User"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
          </Dialog>
        </PermissionGuard>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList>
          <TabsTrigger value="users">All Users</TabsTrigger>
          <PermissionGuard permission={PERMISSIONS.SYSTEM_ADMIN}>
            <TabsTrigger value="roles">Role Management</TabsTrigger>
          </PermissionGuard>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Users List</CardTitle>
              <CardDescription>
                Manage user accounts and their permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Loading users...</span>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center py-8 text-destructive">
                  <AlertCircle className="h-8 w-8 mr-2" />
                  <span>{error}</span>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id} className={!user.is_active ? "opacity-60" : ""}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{user.full_name}</div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {user.email}
                            </div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {user.mobile_number || 'N/A'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              @{user.username}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadgeVariant(user.role)}>
                            <Shield className="h-3 w-3 mr-1" />
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.departments && user.departments.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {user.departments.map((dept) => (
                                <Badge
                                  key={dept}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {departments.find(d => d.value === dept)?.label || dept}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={user.is_active ? "default" : "secondary"}
                            className="cursor-pointer"
                            onClick={() => toggleUserStatus(user.id)}
                          >
                            {user.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3" />
                            {formatDate(user.created_at)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <PermissionButton
                              permission={PERMISSIONS.USERS_UPDATE}
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditUser(user)}
                              disabled={!user.is_active}
                              hideIfNoPermission
                            >
                              <Edit className="h-4 w-4" />
                            </PermissionButton>
                            {user.is_active ? (
                              <PermissionButton
                                permission={PERMISSIONS.USERS_DELETE}
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteUser(user.id)}
                                hideIfNoPermission
                              >
                                <Trash2 className="h-4 w-4" />
                              </PermissionButton>
                            ) : (
                              <PermissionButton
                                permission={PERMISSIONS.USERS_UPDATE}
                                variant="outline"
                                size="sm"
                                onClick={() => toggleUserStatus(user.id)}
                                className="text-green-600 hover:text-green-700"
                                hideIfNoPermission
                              >
                                Reactivate
                              </PermissionButton>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <PermissionGuard permission={PERMISSIONS.SYSTEM_ADMIN}>
          <TabsContent value="roles">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {roles.map((role) => (
              <Card key={role.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    {role.display_name}
                  </CardTitle>
                  <CardDescription>
                    {role.description || `${role.display_name} role with level ${role.level} access`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={getRoleBadgeVariant(role.name)}>
                        Level {role.level}
                      </Badge>
                      {role.department && (
                        <Badge variant="outline">
                          {role.department}
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Role Details:</p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Role Name: {role.name}</li>
                        <li>• Access Level: {role.level}</li>
                        {role.department && <li>• Department: {role.department}</li>}
                        <li>• Status: {role.is_active ? 'Active' : 'Inactive'}</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          </TabsContent>
        </PermissionGuard>
      </Tabs>
    </div>
  );
};

export default UserManagement;
