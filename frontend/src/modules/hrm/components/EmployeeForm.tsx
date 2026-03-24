"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { CalendarIcon, Save, X } from 'lucide-react';
import { EmployeeFormProps, CreateEmployeeForm, Department, Designation, Employee } from '../types';
import { HRMApiService } from '../services/hrm-api';
import { RBACApi } from '@/services/rbac-api';
import { Role } from '@/services/rbac-types';

const EmployeeForm: React.FC<EmployeeFormProps> = ({
  employee,
  onSubmit,
  onCancel,
  loading = false
}) => {
  const [formData, setFormData] = useState<CreateEmployeeForm>({
    employee_id: '',
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: undefined,
    marital_status: undefined,
    nationality: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'Bangladesh',
    phone: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
    blood_group: '',
    cnic: '',
    passport_number: '',
    tax_id: '',
    designation_id: undefined,
    reporting_manager_id: undefined,
    department_id: undefined,
    employment_type: 'permanent',
    join_date: '',
    confirmation_date: '',
    probation_period_months: 6,
    notice_period_days: 30,
    work_location: '',
    shift_type: 'day',
    bank_account_number: '',
    bank_name: '',
    skill_level: 'beginner',
    availability_status: 'available',
    hourly_rate: undefined,
    create_user_account: true,
    username: '',
    email: '',
    password: '',
    role_id: undefined,
  });

  const [roles, setRoles] = useState<Role[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [managers, setManagers] = useState<Employee[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const getInitialFormData = (): CreateEmployeeForm => ({
    employee_id: '',
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: undefined,
    marital_status: undefined,
    nationality: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'Bangladesh',
    phone: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
    blood_group: '',
    cnic: '',
    passport_number: '',
    tax_id: '',
    designation_id: undefined,
    reporting_manager_id: undefined,
    department_id: undefined,
    employment_type: 'permanent',
    join_date: '',
    confirmation_date: '',
    probation_period_months: 6,
    notice_period_days: 30,
    work_location: '',
    shift_type: 'day',
    bank_account_number: '',
    bank_name: '',
    skill_level: 'beginner',
    availability_status: 'available',
    hourly_rate: undefined,
    termination_date: '',
    create_user_account: true,
    username: '',
    email: '',
    password: '',
    role_id: undefined,
  });

  useEffect(() => {
    if (employee) {
      const departmentId = employee.department_id ?? employee.department?.id;
      const designationId = employee.designation_id ?? employee.designation?.id;
      const hasUserAccount = !!employee.user_id;
      setFormData({
        ...getInitialFormData(),
        employee_id: employee.employee_id,
        first_name: employee.first_name || '',
        last_name: employee.last_name || '',
        date_of_birth: employee.date_of_birth || '',
        gender: employee.gender,
        marital_status: employee.marital_status,
        nationality: employee.nationality || '',
        address: employee.address || '',
        city: employee.city || '',
        state: employee.state || '',
        postal_code: employee.postal_code || '',
        country: employee.country || 'Bangladesh',
        phone: employee.phone || '',
        emergency_contact_name: employee.emergency_contact_name || '',
        emergency_contact_phone: employee.emergency_contact_phone || '',
        emergency_contact_relationship: employee.emergency_contact_relationship || '',
        blood_group: employee.blood_group || '',
        cnic: employee.cnic || '',
        passport_number: employee.passport_number || '',
        tax_id: employee.tax_id || '',
        designation_id: designationId,
        reporting_manager_id: employee.reporting_manager_id,
        department_id: departmentId,
        employment_type: employee.employment_type,
        join_date: employee.join_date || '',
        confirmation_date: employee.confirmation_date || '',
        probation_period_months: employee.probation_period_months,
        notice_period_days: employee.notice_period_days,
        work_location: employee.work_location || '',
        shift_type: employee.shift_type,
        termination_date: employee.termination_date || '',
        bank_account_number: employee.bank_account_number || '',
        bank_name: employee.bank_name || '',
        skill_level: employee.skill_level,
        availability_status: employee.availability_status,
        hourly_rate: employee.hourly_rate,
        create_user_account: !hasUserAccount,
        username: '',
        email: '',
        password: '',
        role_id: undefined,
      });
    } else {
      setFormData(getInitialFormData());
    }
  }, [employee]);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await RBACApi.getAllRoles({ is_active: true });
        if (response && response.roles) {
          setRoles(response.roles);
        }
      } catch (error) {
        console.error("Failed to fetch roles", error);
      }
    };

    const fetchDropdownData = async () => {
      try {
        const [deptRes, desigRes, managerRes] = await Promise.all([
          HRMApiService.getDepartments({ is_active: true, limit: 100 }),
          HRMApiService.getDesignations({ is_active: true, limit: 100 }),
          HRMApiService.getEmployees({ is_active: true, limit: 1000 })
        ]);

        if (deptRes && deptRes.departments) {
          setDepartments(deptRes.departments);
        }
        if (desigRes && desigRes.designations) {
          setDesignations(desigRes.designations);
        }
        if (managerRes && managerRes.employees) {
          setManagers(managerRes.employees);
        }
      } catch (error) {
        console.error("Failed to fetch dropdown data", error);
      }
    };

    fetchRoles();
    fetchDropdownData();
  }, []);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.employee_id.trim()) {
      newErrors.employee_id = 'Employee ID is required';
    }

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    }

    if (!formData.cnic?.trim()) {
      newErrors.cnic = 'CNIC is required';
    } else if (formData.cnic.length !== 15) {
      newErrors.cnic = 'CNIC must be 15 digits';
    }

    if (!formData.employment_type) {
      newErrors.employment_type = 'Employment type is required';
    }

    if (!formData.join_date) {
      newErrors.join_date = 'Join date is required';
    }

    if (formData.create_user_account !== false) {
      if (!formData.username?.trim()) {
        newErrors.username = 'Username is required for user account creation';
      }

      if (!formData.email?.trim()) {
        newErrors.email = 'Email is required for user account creation';
      }

      if (!formData.password?.trim()) {
        newErrors.password = 'Password is required for user account creation';
      }

      if (!formData.role_id) {
        newErrors.role_id = 'Role is required for user account creation';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      // Error handling is done in parent component
    }
  };

  const handleInputChange = (field: keyof CreateEmployeeForm, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="personal" data-testid="personal-tab">Personal Information</TabsTrigger>
          <TabsTrigger value="employment" data-testid="employment-tab">Employment Details</TabsTrigger>
          <TabsTrigger value="banking" data-testid="banking-tab">Banking & Additional</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-4" data-testid="personal-tab-content">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employee_id">Employee ID *</Label>
              <Input
                id="employee_id"
                data-testid="employee-id-input"
                value={formData.employee_id}
                onChange={(e) => handleInputChange('employee_id', e.target.value)}
                placeholder="EMP001"
                className={errors.employee_id ? 'border-destructive' : ''}
              />
              {errors.employee_id && (
                <p className="text-sm text-destructive" data-testid="employee-id-error">{errors.employee_id}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                data-testid="first-name-input"
                value={formData.first_name}
                onChange={(e) => handleInputChange('first_name', e.target.value)}
                placeholder="John"
                className={errors.first_name ? 'border-destructive' : ''}
              />
              {errors.first_name && (
                <p className="text-sm text-destructive" data-testid="first-name-error">{errors.first_name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name *</Label>
              <Input
                id="last_name"
                data-testid="last-name-input"
                value={formData.last_name}
                onChange={(e) => handleInputChange('last_name', e.target.value)}
                placeholder="Doe"
                className={errors.last_name ? 'border-destructive' : ''}
              />
              {errors.last_name && (
                <p className="text-sm text-destructive" data-testid="last-name-error">{errors.last_name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="date_of_birth">Date of Birth</Label>
              <Input
                id="date_of_birth"
                data-testid="date-of-birth-input"
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select value={formData.gender} onValueChange={(value) => handleInputChange('gender', value)}>
                <SelectTrigger data-testid="gender-select">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male" data-testid="gender-male-option">Male</SelectItem>
                  <SelectItem value="female" data-testid="gender-female-option">Female</SelectItem>
                  <SelectItem value="other" data-testid="gender-other-option">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="marital_status">Marital Status</Label>
              <Select value={formData.marital_status} onValueChange={(value) => handleInputChange('marital_status', value)}>
                <SelectTrigger data-testid="marital-status-select">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single" data-testid="marital-single-option">Single</SelectItem>
                  <SelectItem value="married" data-testid="marital-married-option">Married</SelectItem>
                  <SelectItem value="divorced" data-testid="marital-divorced-option">Divorced</SelectItem>
                  <SelectItem value="widowed" data-testid="marital-widowed-option">Widowed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cnic">CNIC *</Label>
              <Input
                id="cnic"
                data-testid="cnic-input"
                value={formData.cnic}
                onChange={(e) => handleInputChange('cnic', e.target.value)}
                placeholder="12345-1234567-1"
                className={errors.cnic ? 'border-destructive' : ''}
              />
              {errors.cnic && (
                <p className="text-sm text-destructive" data-testid="cnic-error">{errors.cnic}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                data-testid="phone-input"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+92 300 1234567"
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                data-testid="address-input"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Street address, city, province"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nationality">Nationality</Label>
              <Input
                id="nationality"
                data-testid="nationality-input"
                value={formData.nationality}
                onChange={(e) => handleInputChange('nationality', e.target.value)}
                placeholder="Enter nationality"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="blood_group">Blood Group</Label>
              <Select value={formData.blood_group} onValueChange={(value) => handleInputChange('blood_group', value)}>
                <SelectTrigger data-testid="blood-group-select">
                  <SelectValue placeholder="Select blood group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A+" data-testid="blood-group-apos-option">A+</SelectItem>
                  <SelectItem value="A-" data-testid="blood-group-aneg-option">A-</SelectItem>
                  <SelectItem value="B+" data-testid="blood-group-bpos-option">B+</SelectItem>
                  <SelectItem value="B-" data-testid="blood-group-bneg-option">B-</SelectItem>
                  <SelectItem value="AB+" data-testid="blood-group-abpos-option">AB+</SelectItem>
                  <SelectItem value="AB-" data-testid="blood-group-abneg-option">AB-</SelectItem>
                  <SelectItem value="O+" data-testid="blood-group-opos-option">O+</SelectItem>
                  <SelectItem value="O-" data-testid="blood-group-oneg-option">O-</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Emergency Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emergency_contact_name">Contact Name</Label>
                  <Input
                    id="emergency_contact_name"
                    data-testid="emergency-contact-name-input"
                    value={formData.emergency_contact_name}
                    onChange={(e) => handleInputChange('emergency_contact_name', e.target.value)}
                    placeholder="Emergency contact name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergency_contact_phone">Contact Phone</Label>
                  <Input
                    id="emergency_contact_phone"
                    data-testid="emergency-contact-phone-input"
                    value={formData.emergency_contact_phone}
                    onChange={(e) => handleInputChange('emergency_contact_phone', e.target.value)}
                    placeholder="+92 300 1234567"
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="emergency_contact_relationship">Relationship</Label>
                  <Input
                    id="emergency_contact_relationship"
                    data-testid="emergency-contact-relationship-input"
                    value={formData.emergency_contact_relationship}
                    onChange={(e) => handleInputChange('emergency_contact_relationship', e.target.value)}
                    placeholder="Father, Mother, Spouse, etc."
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employment" className="space-y-4" data-testid="employment-tab-content">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employment_type">Employment Type *</Label>
              <Select value={formData.employment_type} onValueChange={(value) => handleInputChange('employment_type', value)}>
                <SelectTrigger className={errors.employment_type ? 'border-destructive' : ''} data-testid="employment-type-select">
                  <SelectValue placeholder="Select employment type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="permanent" data-testid="employment-permanent-option">Permanent</SelectItem>
                  <SelectItem value="contract" data-testid="employment-contract-option">Contract</SelectItem>
                  <SelectItem value="intern" data-testid="employment-intern-option">Intern</SelectItem>
                  <SelectItem value="consultant" data-testid="employment-consultant-option">Consultant</SelectItem>
                </SelectContent>
              </Select>
              {errors.employment_type && (
                <p className="text-sm text-destructive" data-testid="employment-type-error">{errors.employment_type}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="join_date">Join Date *</Label>
              <Input
                id="join_date"
                data-testid="join-date-input"
                type="date"
                value={formData.join_date}
                onChange={(e) => handleInputChange('join_date', e.target.value)}
                className={errors.join_date ? 'border-destructive' : ''}
              />
              {errors.join_date && (
                <p className="text-sm text-destructive" data-testid="join-date-error">{errors.join_date}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="probation_period_months">Probation Period (months)</Label>
              <Input
                id="probation_period_months"
                data-testid="probation-period-input"
                type="number"
                value={formData.probation_period_months}
                onChange={(e) => handleInputChange('probation_period_months', parseInt(e.target.value))}
                min={0}
                max={24}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notice_period_days">Notice Period (days)</Label>
              <Input
                id="notice_period_days"
                data-testid="notice-period-input"
                type="number"
                value={formData.notice_period_days}
                onChange={(e) => handleInputChange('notice_period_days', parseInt(e.target.value))}
                min={0}
                max={90}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="skill_level">Skill Level</Label>
              <Select value={formData.skill_level} onValueChange={(value) => handleInputChange('skill_level', value)}>
                <SelectTrigger data-testid="skill-level-select">
                  <SelectValue placeholder="Select skill level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner" data-testid="skill-beginner-option">Beginner</SelectItem>
                  <SelectItem value="intermediate" data-testid="skill-intermediate-option">Intermediate</SelectItem>
                  <SelectItem value="expert" data-testid="skill-expert-option">Expert</SelectItem>
                  <SelectItem value="master" data-testid="skill-master-option">Master</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="availability_status">Availability Status</Label>
              <Select value={formData.availability_status} onValueChange={(value) => handleInputChange('availability_status', value)}>
                <SelectTrigger data-testid="availability-status-select">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available" data-testid="availability-available-option">Available</SelectItem>
                  <SelectItem value="busy" data-testid="availability-busy-option">Busy</SelectItem>
                  <SelectItem value="off_duty" data-testid="availability-off-duty-option">Off Duty</SelectItem>
                  <SelectItem value="on_leave" data-testid="availability-on-leave-option">On Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="shift_type">Shift Type</Label>
              <Select value={formData.shift_type} onValueChange={(value) => handleInputChange('shift_type', value)}>
                <SelectTrigger data-testid="shift-type-select">
                  <SelectValue placeholder="Select shift type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day" data-testid="shift-day-option">Day</SelectItem>
                  <SelectItem value="night" data-testid="shift-night-option">Night</SelectItem>
                  <SelectItem value="rotating" data-testid="shift-rotating-option">Rotating</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hourly_rate">Hourly Rate</Label>
              <Input
                id="hourly_rate"
                data-testid="hourly-rate-input"
                type="number"
                step="0.01"
                value={formData.hourly_rate || ''}
                onChange={(e) => handleInputChange('hourly_rate', parseFloat(e.target.value) || undefined)}
                placeholder="100.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="work_location">Work Location</Label>
              <Input
                id="work_location"
                data-testid="work-location-input"
                value={formData.work_location}
                onChange={(e) => handleInputChange('work_location', e.target.value)}
                placeholder="Office, Factory, Remote, etc."
              />
            </div>
          </div>

          <Separator />

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Employment Dates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="confirmation_date">Confirmation Date</Label>
                  <Input
                    id="confirmation_date"
                    data-testid="confirmation-date-input"
                    type="date"
                    value={formData.confirmation_date}
                    onChange={(e) => handleInputChange('confirmation_date', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="termination_date">Termination Date</Label>
                  <Input
                    id="termination_date"
                    data-testid="termination-date-input"
                    type="date"
                    value={formData.termination_date}
                    onChange={(e) => handleInputChange('termination_date', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">Department (Legacy)</Label>
                  <Input
                    id="department"
                    data-testid="legacy-department-input"
                    value={formData.department}
                    onChange={(e) => handleInputChange('department', e.target.value)}
                    placeholder="Legacy department field"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="current_work_order_id">Current Work Order ID</Label>
                  <Input
                    id="current_work_order_id"
                    data-testid="current-work-order-input"
                    type="number"
                    value={formData.current_work_order_id || ''}
                    onChange={(e) => handleInputChange('current_work_order_id', e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="Work order ID"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {formData.create_user_account ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">User Account Creation</CardTitle>
              <CardDescription>
                Create a user account for this employee to enable system access
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    id="username"
                    data-testid="username-input"
                    value={formData.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    placeholder="Username for login"
                  />
                  {errors.username && (
                    <p className="text-sm text-destructive" data-testid="username-error">{errors.username}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    data-testid="email-input"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="user@company.com"
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive" data-testid="email-error">{errors.email}</p>
                  )}
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="role_id">Role *</Label>
                  <Select
                    value={formData.role_id?.toString()}
                    onValueChange={(value) => handleInputChange('role_id', value ? parseInt(value) : undefined)}
                  >
                    <SelectTrigger data-testid="role-select" id="role_id">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id.toString()}>
                          {role.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.role_id && (
                    <p className="text-sm text-destructive" data-testid="role-id-error">{errors.role_id}</p>
                  )}
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    data-testid="password-input"
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder="Temporary password"
                  />
                  {errors.password && (
                    <p className="text-sm text-destructive" data-testid="password-error">{errors.password}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">User Account</CardTitle>
              <CardDescription>
                This employee already has a user account
              </CardDescription>
            </CardHeader>
          </Card>
          )}

          <Separator />

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Organizational Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="department_id">Department</Label>
                  <Select value={formData.department_id?.toString()} onValueChange={(value) => handleInputChange('department_id', value ? parseInt(value) : undefined)}>
                    <SelectTrigger data-testid="department-select" id="department_id">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id.toString()}>
                          {dept.name} ({dept.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="designation_id">Designation</Label>
                  <Select value={formData.designation_id?.toString()} onValueChange={(value) => handleInputChange('designation_id', value ? parseInt(value) : undefined)}>
                    <SelectTrigger data-testid="designation-select" id="designation_id">
                      <SelectValue placeholder="Select designation" />
                    </SelectTrigger>
                    <SelectContent>
                      {designations.map((desig) => (
                        <SelectItem key={desig.id} value={desig.id.toString()}>
                          {desig.title} ({desig.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="reporting_manager_id">Reporting Manager</Label>
                  <Select value={formData.reporting_manager_id?.toString()} onValueChange={(value) => handleInputChange('reporting_manager_id', value ? parseInt(value) : undefined)}>
                    <SelectTrigger data-testid="reporting-manager-select">
                      <SelectValue placeholder="Select reporting manager" />
                    </SelectTrigger>
                    <SelectContent>
                      {managers.map((mgr) => (
                        <SelectItem key={mgr.id} value={mgr.id.toString()}>
                          {mgr.first_name} {mgr.last_name} ({mgr.employee_id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="banking" className="space-y-4" data-testid="banking-tab-content">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Banking Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bank_account_number">Bank Account Number</Label>
                  <Input
                    id="bank_account_number"
                    data-testid="bank-account-number-input"
                    value={formData.bank_account_number}
                    onChange={(e) => handleInputChange('bank_account_number', e.target.value)}
                    placeholder="Account number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bank_name">Bank Name</Label>
                  <Input
                    id="bank_name"
                    data-testid="bank-name-input"
                    value={formData.bank_name}
                    onChange={(e) => handleInputChange('bank_name', e.target.value)}
                    placeholder="Bank name"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="passport_number">Passport Number</Label>
                  <Input
                    id="passport_number"
                    data-testid="passport-number-input"
                    value={formData.passport_number}
                    onChange={(e) => handleInputChange('passport_number', e.target.value)}
                    placeholder="Passport number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tax_id">Tax ID</Label>
                  <Input
                    id="tax_id"
                    data-testid="tax-id-input"
                    value={formData.tax_id}
                    onChange={(e) => handleInputChange('tax_id', e.target.value)}
                    placeholder="Tax identification number"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading} data-testid="cancel-button">
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button type="submit" disabled={loading} data-testid="submit-button">
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Saving...' : (employee ? 'Update Employee' : 'Create Employee')}
        </Button>
      </div>
    </form>
  );
};

export default EmployeeForm;
