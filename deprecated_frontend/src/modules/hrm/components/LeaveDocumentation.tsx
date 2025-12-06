import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  FileText,
  Upload,
  Save,
  RotateCcw,
  Info,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { LeaveDocumentationProps } from '../types';
import { getDocumentTypeOptions } from '../data/leave-configuration-data';

const LeaveDocumentation: React.FC<LeaveDocumentationProps> = ({
  leaveType,
  onUpdate,
  loading = false
}) => {
  const [formData, setFormData] = useState({
    requires_documentation: leaveType.requires_documentation,
    mandatory_document_types: leaveType.mandatory_document_types || [],
    optional_document_types: leaveType.optional_document_types || [],
  });

  const [hasChanges, setHasChanges] = useState(false);

  const documentTypeOptions = getDocumentTypeOptions();

  const handleInputChange = (field: string, value: boolean | string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleDocumentTypeChange = (type: string, category: 'mandatory' | 'optional', checked: boolean) => {
    const field = category === 'mandatory' ? 'mandatory_document_types' : 'optional_document_types';

    setFormData(prev => ({
      ...prev,
      [field]: checked
        ? [...(prev[field] as string[]), type]
        : (prev[field] as string[]).filter(item => item !== type)
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await onUpdate(formData);
      setHasChanges(false);
    } catch (error) {
      // Error handling is done in parent component
    }
  };

  const handleReset = () => {
    setFormData({
      requires_documentation: leaveType.requires_documentation,
      mandatory_document_types: leaveType.mandatory_document_types || [],
      optional_document_types: leaveType.optional_document_types || [],
    });
    setHasChanges(false);
  };

  return (
    <div className="space-y-6">
      {/* Current Configuration Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current Documentation Settings</CardTitle>
          <CardDescription>
            Overview of current documentation requirements for {leaveType.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {formData.requires_documentation ? 'Required' : 'Not Required'}
              </div>
              <div className="text-sm text-muted-foreground">Documentation</div>
            </div>

            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {formData.mandatory_document_types.length}
              </div>
              <div className="text-sm text-muted-foreground">Mandatory Docs</div>
            </div>

            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {formData.optional_document_types.length}
              </div>
              <div className="text-sm text-muted-foreground">Optional Docs</div>
            </div>
          </div>

          {/* Document Lists */}
          {(formData.mandatory_document_types.length > 0 || formData.optional_document_types.length > 0) && (
            <div className="mt-4 space-y-3">
              {formData.mandatory_document_types.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-red-600">Mandatory Documents:</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {formData.mandatory_document_types.map(doc => (
                      <Badge key={doc} variant="destructive" className="text-xs">
                        {doc}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {formData.optional_document_types.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-green-600">Optional Documents:</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {formData.optional_document_types.map(doc => (
                      <Badge key={doc} variant="outline" className="text-green-600 text-xs">
                        {doc}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documentation Requirements Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documentation Requirements
          </CardTitle>
          <CardDescription>
            Configure what documents employees need to submit for leave applications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Require Documentation Toggle */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="requires_documentation">Require Documentation</Label>
                <p className="text-sm text-muted-foreground">
                  Employees must upload supporting documents for leave applications
                </p>
              </div>
              <Switch
                id="requires_documentation"
                checked={formData.requires_documentation}
                onCheckedChange={(checked) => handleInputChange('requires_documentation', checked)}
              />
            </div>
          </div>

          {formData.requires_documentation && (
            <>
              <Separator />

              {/* Mandatory Documents */}
              <div className="space-y-3">
                <Label className="text-base font-medium flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  Mandatory Documents
                </Label>
                <p className="text-sm text-muted-foreground">
                  Documents that must be provided for leave approval
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {documentTypeOptions.map(docType => (
                    <div key={docType} className="flex items-center space-x-2">
                      <Checkbox
                        id={`mandatory-${docType}`}
                        checked={formData.mandatory_document_types.includes(docType)}
                        onCheckedChange={(checked) => handleDocumentTypeChange(docType, 'mandatory', checked as boolean)}
                      />
                      <Label htmlFor={`mandatory-${docType}`} className="text-sm">
                        {docType}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Optional Documents */}
              <div className="space-y-3">
                <Label className="text-base font-medium flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Optional Documents
                </Label>
                <p className="text-sm text-muted-foreground">
                  Additional documents that can be provided to support the leave application
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {documentTypeOptions.map(docType => (
                    <div key={docType} className="flex items-center space-x-2">
                      <Checkbox
                        id={`optional-${docType}`}
                        checked={formData.optional_document_types.includes(docType)}
                        onCheckedChange={(checked) => handleDocumentTypeChange(docType, 'optional', checked as boolean)}
                      />
                      <Label htmlFor={`optional-${docType}`} className="text-sm">
                        {docType}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Information Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Documentation Guidelines
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-3">
              <div>
                <h4 className="font-medium">Mandatory Documents</h4>
                <ul className="text-sm text-muted-foreground space-y-1 mt-1">
                  <li>• Required for leave approval</li>
                  <li>• Must be uploaded before submission</li>
                  <li>• HR will verify document authenticity</li>
                  <li>• Applications without mandatory documents will be rejected</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium">Optional Documents</h4>
                <ul className="text-sm text-muted-foreground space-y-1 mt-1">
                  <li>• Provide additional supporting evidence</li>
                  <li>• Can be uploaded after initial submission</li>
                  <li>• Help expedite approval process</li>
                  <li>• Not required for approval</li>
                </ul>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="font-medium">Document Types</h4>
                <ul className="text-sm text-muted-foreground space-y-1 mt-1">
                  <li>• <strong>Medical Certificate:</strong> Doctor's note for sick leave</li>
                  <li>• <strong>Birth Certificate:</strong> For maternity/paternity leave</li>
                  <li>• <strong>Training Certificate:</strong> For study leave</li>
                  <li>• <strong>Police Report:</strong> For emergency situations</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium">Best Practices</h4>
                <ul className="text-sm text-muted-foreground space-y-1 mt-1">
                  <li>• Keep document file sizes under 5MB</li>
                  <li>• Use clear, readable document images</li>
                  <li>• Ensure documents are current and valid</li>
                  <li>• Multiple documents should be combined into single PDF</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {hasChanges && (
        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={handleReset} disabled={loading}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset Changes
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default LeaveDocumentation;
