import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Trash2, Search, UserPlus, Crown, Eye, Wrench } from 'lucide-react';
import { FactoriesAPI } from '../services/factories-api';
import { Factory, UserFactoryRole, AssignUserToFactoryRequest } from '../types';
import { useToast } from '@/hooks/use-toast';
import { AuthApi, User } from '@/services/auth-api';

interface UserFactoryAssignmentProps {
  factory: Factory;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const UserFactoryAssignment: React.FC<UserFactoryAssignmentProps> = ({
  factory,
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [assignments, setAssignments] = useState<UserFactoryRole[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [removingAssignment, setRemovingAssignment] = useState<UserFactoryRole | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newAssignment, setNewAssignment] = useState<AssignUserToFactoryRequest>({
    userId: 0,
    role: 'worker',
    isPrimary: false,
  });
  const { toast } = useToast();

  const loadAssignments = useCallback(async () => {
    try {
      setLoading(true);
      const factoryUsers = await FactoriesAPI.getFactoryUsers(factory.id);
      setAssignments(factoryUsers);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load user assignments',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [factory.id, toast]);

  const loadUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      const allUsers = await AuthApi.getAllUsers();
      // Filter out inactive users and sort by name
      const activeUsers = allUsers
        .filter(user => user.is_active)
        .sort((a, b) => a.full_name.localeCompare(b.full_name));
      setUsers(activeUsers);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load users',
        variant: 'destructive',
      });
    } finally {
      setLoadingUsers(false);
    }
  }, [toast]);

  useEffect(() => {
    if (open && factory) {
      loadAssignments();
      loadUsers();
    }
  }, [open, factory, loadAssignments, loadUsers]);

  const handleAssignUser = async () => {
    if (!selectedUser) {
      toast({
        title: 'Error',
        description: 'Please select a user',
        variant: 'destructive',
      });
      return;
    }

    try {
      await FactoriesAPI.assignUserToFactory(factory.id, {
        userId: selectedUser.id,
        role: newAssignment.role,
        isPrimary: newAssignment.isPrimary,
      });
      toast({
        title: 'Success',
        description: `${selectedUser.full_name} assigned to factory "${factory.name}" as ${newAssignment.role}`,
      });
      setShowAssignDialog(false);
      setSelectedUser(null);
      setNewAssignment({ userId: 0, role: 'worker', isPrimary: false });
      loadAssignments();
      onSuccess();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to assign user to factory',
        variant: 'destructive',
      });
    }
  };

  const handleAssignDialogClose = () => {
    setShowAssignDialog(false);
    setSelectedUser(null);
    setNewAssignment({ userId: 0, role: 'worker', isPrimary: false });
  };

  const handleRemoveAssignment = async (assignment: UserFactoryRole) => {
    try {
      await FactoriesAPI.removeUserFromFactory(factory.id, assignment.user_id);
      toast({
        title: 'Success',
        description: `User removed from factory "${factory.name}" successfully`,
      });
      setRemovingAssignment(null);
      loadAssignments();
      onSuccess();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to remove user from factory',
        variant: 'destructive',
      });
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'manager':
        return <Crown className="h-4 w-4 text-yellow-600" />;
      case 'worker':
        return <Wrench className="h-4 w-4 text-blue-600" />;
      case 'viewer':
        return <Eye className="h-4 w-4 text-gray-600" />;
      default:
        return null;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'manager':
        return 'default';
      case 'worker':
        return 'secondary';
      case 'viewer':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const filteredAssignments = assignments.filter(assignment =>
    assignment.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assignment.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assignment.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="user-assignment-dialog">
        <DialogHeader>
          <DialogTitle data-testid="user-assignment-title">Manage Users - {factory.name}</DialogTitle>
          <DialogDescription data-testid="user-assignment-description">
            Assign users to this factory and manage their roles and permissions.
          </DialogDescription>
        </DialogHeader>

          <div className="space-y-4">
            {/* Header with search and add user */}
            <div className="flex items-center justify-between" data-testid="user-assignment-header">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="user-search-input"
                />
              </div>
              <Button onClick={() => setShowAssignDialog(true)} data-testid="assign-user-button">
                <UserPlus className="mr-2 h-4 w-4" />
                Assign User
              </Button>
            </div>

            {/* Users table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Primary</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        Loading users...
                      </TableCell>
                    </TableRow>
                  ) : filteredAssignments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        No users found. {searchTerm && 'Try adjusting your search.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAssignments.map((assignment) => (
                      <TableRow key={`${assignment.user_id}-${assignment.factory_id}`}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getRoleIcon(assignment.role)}
                            <div>
                              <div className="font-medium">{assignment.full_name}</div>
                              <div className="text-sm text-gray-500">@{assignment.username}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{assignment.email}</TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadgeVariant(assignment.role)}>
                            {assignment.role.charAt(0).toUpperCase() + assignment.role.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {assignment.is_primary && (
                            <Badge variant="default">Primary</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setRemovingAssignment(assignment)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign User Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent data-testid="assign-user-dialog">
          <DialogHeader>
            <DialogTitle data-testid="assign-user-title">Assign User to Factory</DialogTitle>
            <DialogDescription data-testid="assign-user-description">
              Add a user to this factory and assign them a role.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="user">Select User</Label>
              <Select
                value={selectedUser?.id.toString() || ''}
                onValueChange={(value) => {
                  const user = users.find(u => u.id.toString() === value);
                  setSelectedUser(user || null);
                }}
                disabled={loadingUsers}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingUsers ? "Loading users..." : "Select a user"} />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      <div className="flex flex-col">
                        <span className="font-medium">{user.full_name}</span>
                        <span className="text-sm text-gray-500">@{user.username} • {user.email}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="role">Role</Label>
              <Select
                value={newAssignment.role}
                onValueChange={(value: 'manager' | 'worker' | 'viewer') =>
                  setNewAssignment(prev => ({ ...prev, role: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">
                    <div className="flex items-center space-x-2">
                      <Crown className="h-4 w-4" />
                      <span>Manager</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="worker">
                    <div className="flex items-center space-x-2">
                      <Wrench className="h-4 w-4" />
                      <span>Worker</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="viewer">
                    <div className="flex items-center space-x-2">
                      <Eye className="h-4 w-4" />
                      <span>Viewer</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isPrimary"
                checked={newAssignment.isPrimary}
                onChange={(e) => setNewAssignment(prev => ({
                  ...prev,
                  isPrimary: e.target.checked
                }))}
              />
              <Label htmlFor="isPrimary">Set as primary factory for this user</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleAssignDialogClose}>
              Cancel
            </Button>
            <Button onClick={handleAssignUser}>
              Assign User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Assignment Confirmation */}
      <AlertDialog open={!!removingAssignment} onOpenChange={() => setRemovingAssignment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove User Assignment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {removingAssignment?.full_name} from factory "{factory.name}"?
              They will lose access to this factory's data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removingAssignment && handleRemoveAssignment(removingAssignment)}
              className="bg-red-600 hover:bg-red-700"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default UserFactoryAssignment;
