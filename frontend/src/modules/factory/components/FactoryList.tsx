import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { MoreHorizontal, Plus, Search, Edit, Trash2, Users } from 'lucide-react';
import { FactoriesAPI } from '../services/factories-api';
import { Factory } from '../types';
import { useToast } from '@/hooks/use-toast';
import FactoryForm from './FactoryForm';
import UserFactoryAssignment from './UserFactoryAssignment';

interface FactoryListProps {
  onFactorySelect?: (factory: Factory) => void;
}

const FactoryList: React.FC<FactoryListProps> = ({ onFactorySelect }) => {
  const [factories, setFactories] = useState<Factory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFactory, setSelectedFactory] = useState<Factory | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showAssignment, setShowAssignment] = useState(false);
  const [editingFactory, setEditingFactory] = useState<Factory | null>(null);
  const [deletingFactory, setDeletingFactory] = useState<Factory | null>(null);
  const { toast } = useToast();

  const loadFactories = async () => {
    try {
      setLoading(true);
      const params = searchTerm ? { search: searchTerm } : {};
      const response = await FactoriesAPI.getAllFactories(params);
      setFactories(response.factories);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load factories',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFactories();
  }, [searchTerm, toast]);

  const handleCreateFactory = () => {
    setEditingFactory(null);
    setShowForm(true);
  };

  const handleEditFactory = (factory: Factory) => {
    setEditingFactory(factory);
    setShowForm(true);
  };

  const handleDeleteFactory = async (factory: Factory) => {
    try {
      await FactoriesAPI.deleteFactory(factory.id);
      toast({
        title: 'Success',
        description: `Factory "${factory.name}" deleted successfully`,
      });
      setDeletingFactory(null);
      loadFactories();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete factory',
        variant: 'destructive',
      });
    }
  };

  const handleManageUsers = (factory: Factory) => {
    setSelectedFactory(factory);
    setShowAssignment(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingFactory(null);
    loadFactories();
  };

  const handleAssignmentSuccess = () => {
    setShowAssignment(false);
    setSelectedFactory(null);
  };

  const filteredFactories = factories.filter(factory =>
    factory.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    factory.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">Loading factories...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Factory Management</CardTitle>
            <Button onClick={handleCreateFactory}>
              <Plus className="mr-2 h-4 w-4" />
              Add Factory
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search factories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFactories.map((factory) => (
                <TableRow
                  key={factory.id}
                  className={onFactorySelect ? 'cursor-pointer hover:bg-gray-50' : ''}
                  onClick={() => onFactorySelect?.(factory)}
                >
                  <TableCell className="font-medium">{factory.name}</TableCell>
                  <TableCell>{factory.code}</TableCell>
                  <TableCell>
                    <Badge variant={factory.is_active ? 'default' : 'secondary'}>
                      {factory.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {factory.address.city}, {factory.address.state}
                  </TableCell>
                  <TableCell>
                    {factory.manager_id ? `Manager ID: ${factory.manager_id}` : 'No Manager'}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditFactory(factory)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleManageUsers(factory)}>
                          <Users className="mr-2 h-4 w-4" />
                          Manage Users
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeletingFactory(factory)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredFactories.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No factories found. {searchTerm && 'Try adjusting your search.'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Factory Form Dialog */}
      {showForm && (
        <FactoryForm
          factory={editingFactory}
          open={showForm}
          onOpenChange={setShowForm}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* User Assignment Dialog */}
      {showAssignment && selectedFactory && (
        <UserFactoryAssignment
          factory={selectedFactory}
          open={showAssignment}
          onOpenChange={setShowAssignment}
          onSuccess={handleAssignmentSuccess}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingFactory} onOpenChange={() => setDeletingFactory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Factory</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingFactory?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingFactory && handleDeleteFactory(deletingFactory)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default FactoryList;
