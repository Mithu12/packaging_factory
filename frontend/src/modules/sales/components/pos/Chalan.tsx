"use client";

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Download, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { 
  Document, 
  Page, 
  Text, 
  View, 
  StyleSheet, 
  Image, 
  pdf, 
  Font 
} from '@react-pdf/renderer';
import { SettingsApi } from '@/services/settings-api';
import { CompanySettings } from '@/services/settings-types';

// Register Helvetica fonts (standard font)
// React-PDF doesn't automatically support bold in Helvetica, usually standard fonts work fine
// but for pixel perfection we might need external fonts if required.
// For now we'll use Helvetica and standard bolding.


interface ChalanItem {
  id: number;
  product_name: string;
  quantity: number;
}

interface Customer {
  name: string;
  address?: string;
  email?: string;
  phone?: string;
}

interface ChalanProps {
  chalanNumber: string;
  chalanDate: string;
  customer: Customer | null;
  items: ChalanItem[];
  onClose?: () => void;
}

// Define styles for PDF
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#333',
    lineHeight: 1.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  logo: {
    width: 120,
    height: 'auto',
  },
  titleSection: {
    textAlign: 'right',
    gap: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1D357B',
    marginBottom: 10,
    lineHeight: 1.2,
  },
  chalanInfo: {
    fontSize: 9,
    color: '#333',
    marginBottom: 3,
  },

  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#1D357B',
    marginVertical: 10,
  },
  infoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
    marginTop: 10,
  },
  leftColumn: {
    width: '45%',
  },
  rightColumn: {
    width: '50%',
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  infoText: {
    marginBottom: 3,
  },
  label: {
    fontWeight: 'bold',
  },
  // Table
  table: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1D357B',
    paddingVertical: 8,
    paddingHorizontal: 5,
    color: '#ffffff',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 8,
    paddingHorizontal: 5,
    alignItems: 'center',
  },
  colNo: {
    width: '15%',
    textAlign: 'center',
  },
  colDesc: {
    width: '65%',
    textAlign: 'left',
    paddingLeft: 10,
  },
  colQty: {
    width: '20%',
    textAlign: 'center',
  },
  headerCell: {
    fontWeight: 'bold',
    fontSize: 10,
  },
  // Signatures
  signatureSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 60,
    paddingHorizontal: 10,
  },
  signatureBox: {
    width: '35%',
    textAlign: 'center',
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: '#333',
    borderTopStyle: 'dashed',
    marginBottom: 8,
  },
  signatureLabel: {
    fontSize: 10,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#666',
    fontSize: 8,
  },
});

// PDF Document Component
const ChalanPDF = ({ 
  chalanNumber, 
  chalanDate, 
  customer, 
  items, 
  companySettings, 
  logoBase64 
}: {
  chalanNumber: string;
  chalanDate: string;
  customer: Customer | null;
  items: ChalanItem[];
  companySettings: CompanySettings | null;
  logoBase64: string | null;
}) => (
  <Document title={`Chalan-${chalanNumber}`}>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          {logoBase64 ? (
            <Image src={logoBase64} style={styles.logo} />
          ) : (
            <Text style={[styles.title, { fontSize: 20 }]}>{companySettings?.company_name || 'ERP'}</Text>
          )}
        </View>
        <View style={styles.titleSection}>
          <Text style={styles.title}>CHALAN</Text>
          <Text style={styles.chalanInfo}>Chalan No : {chalanNumber}</Text>
          <Text style={styles.chalanInfo}>
            Chalan Date : {new Date(chalanDate).toLocaleDateString('en-GB', { 
              day: '2-digit', 
              month: '2-digit', 
              year: 'numeric' 
            }).replace(/\//g, '-')}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Info Section */}
      <View style={styles.infoSection}>
        <View style={styles.leftColumn}>
          <Text style={styles.sectionHeader}>Bill To:</Text>
          <Text style={styles.infoText}>
            <Text style={styles.label}>Name : </Text>
            {customer?.name || 'Walk-in Customer'}
          </Text>
          <Text style={styles.infoText}>
            <Text style={styles.label}>Address : </Text>
            {customer?.address || ''}
          </Text>
          <Text style={styles.infoText}>
            <Text style={styles.label}>Email : </Text>
            {customer?.email || ''}
          </Text>
          <Text style={styles.infoText}>
            <Text style={styles.label}>Phone : </Text>
            {customer?.phone || ''}
          </Text>
        </View>

        <View style={styles.rightColumn}>
          <Text style={styles.sectionHeader}>{companySettings?.company_name || 'Zontech international'}:</Text>
          <Text style={styles.infoText}>
            <Text style={styles.label}>Office : </Text>
            {companySettings?.company_address || ''}
          </Text>
          <Text style={styles.infoText}>
            <Text style={styles.label}>Cell : </Text>
            {companySettings?.phone || ''}
          </Text>
          <Text style={styles.infoText}>
            <Text style={styles.label}>Email : </Text>
            {companySettings?.company_email || ''}
          </Text>
        </View>
      </View>

      {/* Table */}
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.colNo, styles.headerCell]}>No.</Text>
          <Text style={[styles.colDesc, styles.headerCell]}>Description</Text>
          <Text style={[styles.colQty, styles.headerCell]}>Quantity</Text>
        </View>
        {(items || []).map((item, index) => (
          <View key={item.id} style={styles.tableRow}>
            <Text style={styles.colNo}>{index + 1}</Text>
            <Text style={styles.colDesc}>{item.product_name}</Text>
            <Text style={styles.colQty}>{item.quantity}</Text>
          </View>
        ))}
      </View>

      {/* Signature Section */}
      <View style={styles.signatureSection}>
        <View style={styles.signatureBox}>
          <View style={styles.signatureLine} />
          <Text style={styles.signatureLabel}>Receiver Signature</Text>
        </View>
        <View style={styles.signatureBox}>
          <View style={styles.signatureLine} />
          <Text style={styles.signatureLabel}>Seller Signature</Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text>https://{companySettings?.company_email?.split('@')[1] || 'zontechinternational.com'}</Text>
      </View>
    </Page>
  </Document>
);

export function Chalan({
  chalanNumber,
  chalanDate,
  customer,
  items,
  onClose
}: ChalanProps) {
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  // Load logo as base64 using Image element with promise
  const loadLogoAsBase64 = (logoUrl: string): Promise<string | null> => {
    return new Promise((resolve) => {
      // Use window.Image to avoid shadowing by @react-pdf/renderer's Image
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const base64 = canvas.toDataURL('image/png');
            console.log('Logo converted to base64 successfully');
            resolve(base64);
          } else {
            console.warn('Could not get canvas context');
            resolve(null);
          }
        } catch (error) {
          console.error('Canvas error:', error);
          resolve(null);
        }
      };
      
      img.onerror = (e) => {
        console.error('Image load error for:', logoUrl, e);
        resolve(null);
      };
      
      // Add timestamp to avoid caching issues
      img.src = logoUrl + (logoUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
    });
  };

  const loadSettings = async () => {
    try {
      const settings = await SettingsApi.getCompanySettings();
      console.log('Company settings loaded:', settings);
      setCompanySettings(settings);
      
      // Load and convert logo to base64 if available
      if (settings.invoice_logo) {
        const baseUrl = process.env.NEXT_PUBLIC_BACKEND_BASE_URL || 'http://localhost:9000';
        const logoUrl = settings.invoice_logo.startsWith('http') 
          ? settings.invoice_logo 
          : `${baseUrl}${settings.invoice_logo}`;
        
        console.log('Loading logo from URL:', logoUrl);
        
        // Try loading the logo
        const base64 = await loadLogoAsBase64(logoUrl);
        if (base64) {
          setLogoBase64(base64);
          console.log('Logo set successfully');
        } else {
          console.warn('Logo could not be loaded, will use company name text instead');
        }
      } else {
        console.log('No invoice_logo in settings');
      }
    } catch (error) {
      console.error('Error loading company settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadChalan = async () => {
    if (loading) return;

    try {
      const blob = await pdf(
        <ChalanPDF 
          chalanNumber={chalanNumber}
          chalanDate={chalanDate}
          customer={customer}
          items={items}
          companySettings={companySettings}
          logoBase64={logoBase64}
        />
      ).toBlob();
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `chalan-${chalanNumber}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: "Chalan Downloaded",
        description: `Chalan ${chalanNumber} downloaded successfully`,
      });
    } catch (error) {
      console.error('Error generating chalan:', error);
      toast({
        title: "Error",
        description: "Failed to generate chalan PDF",
        variant: "destructive"
      });
    }
  };

  const handlePrintChalan = async () => {
    if (loading) return;

    try {
      const blob = await pdf(
        <ChalanPDF 
          chalanNumber={chalanNumber}
          chalanDate={chalanDate}
          customer={customer}
          items={items}
          companySettings={companySettings}
          logoBase64={logoBase64}
        />
      ).toBlob();
      
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url);
      if (printWindow) {
        printWindow.focus();
        // Browser usually handles printing for blob URLs
      }
      
      toast({
        title: "Chalan Printed",
        description: `Chalan ${chalanNumber} sent to printer`,
      });
    } catch (error) {
      console.error('Error printing chalan:', error);
      toast({
        title: "Error",
        description: "Failed to print chalan",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        <span>Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Button 
        onClick={handlePrintChalan}
        className="flex-1"
        variant="outline"
      >
        <FileText className="w-4 h-4 mr-2" />
        Print Chalan
      </Button>
      <Button 
        onClick={handleDownloadChalan}
        className="flex-1"
        variant="outline"
      >
        <Download className="w-4 h-4 mr-2" />
        Download Chalan
      </Button>
    </div>
  );
}
