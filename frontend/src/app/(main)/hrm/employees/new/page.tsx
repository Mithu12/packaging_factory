"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { HRMApiService } from '@/modules/hrm/services/hrm-api';
import { CreateEmployeeForm } from '@/modules/hrm/types';
import EmployeeForm from '@/modules/hrm/components/EmployeeForm';

const AddEmployeePage: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateEmployee = async (data: CreateEmployeeForm) => {
    try {
      setLoading(true);
      setError(null);
      await HRMApiService.createEmployee(data);
      router.push('/hrm/employees');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create employee');
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/hrm/employees');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleCancel}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add New Employee</h1>
          <p className="text-muted-foreground">
            Create a new employee record with personal and employment details
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
          <p>{error}</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Employee Details</CardTitle>
          <CardDescription>Fill in the information below to add a new employee.</CardDescription>
        </CardHeader>
        <CardContent>
          <EmployeeForm
            onSubmit={handleCreateEmployee}
            onCancel={handleCancel}
            loading={loading}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default AddEmployeePage;
