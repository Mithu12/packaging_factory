import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { FactoriesAPI } from '../services/factories-api';
import { Factory, CreateFactoryRequest, UpdateFactoryRequest } from '../types';
import { CostCentersApiService, CostCenter } from '@/services/accounts-api';
import { useToast } from '@/hooks/use-toast';

const factorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be less than 255 characters'),
  code: z.string().min(1, 'Code is required').max(50, 'Code must be less than 50 characters'),
  description: z.string().optional(),
  address: z.object({
    street: z.string().min(1, 'Street is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    postal_code: z.string().min(1, 'Postal code is required'),
    country: z.string().min(1, 'Country is required'),
    contact_name: z.string().optional(),
    contact_phone: z.string().optional(),
  }),
  phone: z.string().optional(),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  manager_id: z.number().optional(),
  cost_center_id: z.number().optional(),
  is_active: z.boolean().default(true),
});

type FactoryFormData = z.infer<typeof factorySchema>;

interface FactoryFormProps {
  factory?: Factory | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const FactoryForm: React.FC<FactoryFormProps> = ({
  factory,
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const { toast } = useToast();
  const isEditing = !!factory;

  const form = useForm<FactoryFormData>({
    resolver: zodResolver(factorySchema),
    defaultValues: {
      name: '',
      code: '',
      description: '',
      address: {
        street: '',
        city: '',
        state: '',
        postal_code: '',
        country: '',
        contact_name: '',
        contact_phone: '',
      },
      phone: '',
      email: '',
      manager_id: undefined,
      cost_center_id: undefined,
      is_active: true,
    },
  });

  // Load cost centers when dialog opens
  useEffect(() => {
    const loadCostCenters = async () => {
      if (open) {
        try {
          const response = await CostCentersApiService.getCostCenters({ 
            status: 'Active', 
            limit: 1000 
          });
          setCostCenters(response.data);
        } catch (error) {
          console.error('Failed to load cost centers:', error);
        }
      }
    };
    loadCostCenters();
  }, [open]);

  useEffect(() => {
    if (factory) {
      form.reset({
        name: factory.name,
        code: factory.code,
        description: factory.description || '',
        address: factory.address,
        phone: factory.phone || '',
        email: factory.email || '',
        manager_id: factory.manager_id,
        cost_center_id: factory.cost_center_id,
        is_active: factory.is_active,
      });
    } else {
      form.reset({
        name: '',
        code: '',
        description: '',
        address: {
          street: '',
          city: '',
          state: '',
          postal_code: '',
          country: '',
          contact_name: '',
          contact_phone: '',
        },
        phone: '',
        email: '',
        manager_id: undefined,
        cost_center_id: undefined,
        is_active: true,
      });
    }
  }, [factory, form]);

  const onSubmit = async (data: FactoryFormData) => {
    try {
      setLoading(true);

      const payload: CreateFactoryRequest | UpdateFactoryRequest = {
        name: data.name,
        code: data.code,
        description: data.description,
        address: data.address,
        phone: data.phone,
        email: data.email,
        manager_id: data.manager_id,
        cost_center_id: data.cost_center_id,
        ...(isEditing && { is_active: data.is_active }),
      };

      if (isEditing && factory) {
        await FactoriesAPI.updateFactory(factory.id, payload as UpdateFactoryRequest);
        toast({
          title: 'Success',
          description: `Factory "${data.name}" updated successfully`,
        });
      } else {
        await FactoriesAPI.createFactory(payload as CreateFactoryRequest);
        toast({
          title: 'Success',
          description: `Factory "${data.name}" created successfully`,
        });
      }

      onSuccess();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : `Failed to ${isEditing ? 'update' : 'create'} factory`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="factory-form-dialog">
        <DialogHeader>
          <DialogTitle data-testid="factory-form-title">
            {isEditing ? 'Edit Factory' : 'Create New Factory'}
          </DialogTitle>
          <DialogDescription data-testid="factory-form-description">
            {isEditing
              ? 'Update the factory information below.'
              : 'Fill in the details to create a new factory.'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4" data-testid="basic-info-section">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel data-testid="factory-name-label">Factory Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter factory name" {...field} data-testid="factory-name-input" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel data-testid="factory-code-label">Factory Code *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter factory code" {...field} data-testid="factory-code-input" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel data-testid="factory-description-label">Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter factory description"
                      className="min-h-[80px]"
                      {...field}
                      data-testid="factory-description-textarea"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Address Information */}
            <div className="space-y-4" data-testid="address-info-section">
              <h3 className="text-lg font-medium" data-testid="address-info-title">Address Information</h3>

              <FormField
                control={form.control}
                name="address.street"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel data-testid="street-address-label">Street Address *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter street address" {...field} data-testid="street-address-input" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4" data-testid="city-state-row">
                <FormField
                  control={form.control}
                  name="address.city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel data-testid="city-label">City *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter city" {...field} data-testid="city-input" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address.state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel data-testid="state-label">State/Province *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter state/province" {...field} data-testid="state-input" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="address.postal_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postal Code *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter postal code" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address.country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter country" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="address.contact_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter contact name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address.contact_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter contact phone" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-2 gap-4" data-testid="contact-info-section">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel data-testid="phone-label">Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter phone number" {...field} data-testid="phone-input" />
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
                    <FormLabel data-testid="email-label">Email</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter email address" {...field} data-testid="email-input" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="manager_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Manager User ID</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Enter manager user ID"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>
                    The user ID of the person who manages this factory
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cost_center_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cost Center</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value ? Number(value) : undefined)}
                    value={field.value?.toString() || ''}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a cost center" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {/* <SelectItem value="">None</SelectItem> */}
                      {costCenters.map((cc) => (
                        <SelectItem key={cc.id} value={cc.id.toString()}>
                          {cc.code} - {cc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Link this factory to a cost center for expense tracking and budget allocation
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isEditing && (
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active Status</FormLabel>
                      <FormDescription>
                        Whether this factory is currently active and operational
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            <DialogFooter data-testid="factory-form-footer">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="cancel-factory-button">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} data-testid="submit-factory-button">
                {loading ? 'Saving...' : (isEditing ? 'Update Factory' : 'Create Factory')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default FactoryForm;
