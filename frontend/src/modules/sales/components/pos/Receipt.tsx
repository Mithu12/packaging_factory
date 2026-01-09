"use client";

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, Download, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { 
  Document, 
  Page, 
  Text, 
  View, 
  StyleSheet, 
  Image, 
  pdf 
} from '@react-pdf/renderer';
import { SettingsApi } from '@/services/settings-api';
import { CompanySettings } from '@/services/settings-types';
import { useFormatting } from '@/hooks/useFormatting';


interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  discount?: number;
  discountType?: 'percentage' | 'fixed';
  isGift: boolean;
}

interface Customer {
  id: number;
  name: string;
  email?: string;
  phone?: string;
}

interface ReceiptProps {
  orderNumber: string;
  customer: Customer | null;
  cart: CartItem[];
  subtotal: number;
  overallDiscount: number;
  overallDiscountType: 'percentage' | 'flat';
  tax: number;
  total: number;
  paymentMethod: string;
  cashReceived?: number;
  changeGiven?: number;
  orderDate: string;
  notes?: string;
  previousDue?: number;
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
    marginBottom: 5,
  },
  logoSection: {
    width: '50%',
  },
  logo: {
    width: 120,
    height: 'auto',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 8,
    color: '#666',
    fontStyle: 'italic',
  },
  titleSection: {
    textAlign: 'right',
    width: '50%',
    gap: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1D357B',
    marginBottom: 8,
    lineHeight: 1.1,
  },
  invoiceInfo: {
    fontSize: 9,
    color: '#333',
    marginBottom: 2,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginVertical: 10,
  },
  infoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    marginTop: 10,
  },
  leftColumn: {
    width: '48%',
  },
  rightColumn: {
    width: '48%',
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
  colNo: { width: '8%', textAlign: 'center' },
  colDesc: { width: '42%', textAlign: 'left', paddingLeft: 10 },
  colQty: { width: '15%', textAlign: 'center' },
  colPrice: { width: '15%', textAlign: 'center' },
  colTotal: { width: '20%', textAlign: 'right', paddingRight: 10 },
  headerCell: {
    fontWeight: 'bold',
    fontSize: 10,
  },
  // Summary
  summarySection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 0, // No margin because it continues from table border
  },
  summaryContainer: {
    width: '40%',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  grandTotalRow: {
    backgroundColor: '#1D357B',
    color: '#ffffff',
  },
  summaryLabel: {
    fontWeight: 'bold',
  },
  summaryValue: {
    textAlign: 'right',
  },
  // Notes
  notesSection: {
    marginTop: 30,
  },
  notesHeader: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  noteItem: {
    fontSize: 8,
    marginBottom: 3,
    color: '#666',
  },
  // Signatures
  signatureSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 50,
  },
  signatureBox: {
    width: '30%',
    textAlign: 'center',
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: '#333',
    borderTopStyle: 'dashed',
    marginBottom: 5,
  },
  signatureLabel: {
    fontSize: 9,
  },
});

// PDF Document Component
const InvoicePDF = ({ 
  orderNumber, 
  orderDate, 
  customer, 
  cart, 
  total,
  cashReceived,
  previousDue = 0,
  companySettings, 
  logoBase64,
  formatCurrency
}: {
  orderNumber: string;
  orderDate: string;
  customer: Customer | null;
  cart: CartItem[];
  total: number;
  cashReceived?: number;
  previousDue?: number;
  companySettings: CompanySettings | null;
  logoBase64: string | null;
  formatCurrency: (val: number) => string;
}) => {
  const paid = cashReceived || 0;
  const currentDue = total - paid;
  const totalDue = currentDue + previousDue;

  return (
    <Document title={`Invoice-${orderNumber}`}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoSection}>
            {logoBase64 ? (
              <Image src={logoBase64} style={styles.logo} />
            ) : (
              <Text style={[styles.title, { fontSize: 20, textAlign: 'left' }]}>{companySettings?.company_name || 'ERP'}</Text>
            )}
            <Text style={styles.subtitle}>Quality First Priority</Text>
          </View>
          <View style={styles.titleSection}>
            <Text style={styles.title}>INVOICE</Text>
            <Text style={styles.invoiceInfo}>Invoice No : {orderNumber}</Text>
            <Text style={styles.invoiceInfo}>
              Invoice Date : {new Date(orderDate).toLocaleDateString('en-GB', { 
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
              {/* Note: Customer interface in Receipt.tsx doesn't have address, but we can add it if needed */}
              {''} 
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
            <Text style={[styles.colPrice, styles.headerCell]}>Item Price</Text>
            <Text style={[styles.colTotal, styles.headerCell]}>Sub Total</Text>
          </View>
          {cart.map((item, index) => (
            <View key={item.id} style={styles.tableRow}>
              <Text style={styles.colNo}>{index + 1}</Text>
              <Text style={styles.colDesc}>{item.name}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colPrice}>{formatCurrency(item.price)}</Text>
              <Text style={styles.colTotal}>{formatCurrency(item.price * item.quantity)}</Text>
            </View>
          ))}
        </View>

        {/* SummarySection */}
        <View style={styles.summarySection}>
          <View style={styles.summaryContainer}>
            <View style={[styles.summaryRow, styles.grandTotalRow]}>
              <Text style={styles.summaryLabel}>Grand Total</Text>
              <Text style={[styles.summaryValue, { fontWeight: 'bold' }]}>{formatCurrency(total)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Paid</Text>
              <Text style={styles.summaryValue}>{formatCurrency(paid)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Due</Text>
              <Text style={styles.summaryValue}>{formatCurrency(currentDue)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Previous Due</Text>
              <Text style={styles.summaryValue}>{formatCurrency(previousDue)}</Text>
            </View>
            <View style={[styles.summaryRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.summaryLabel}>Total Due</Text>
              <Text style={styles.summaryValue}>{formatCurrency(totalDue)}</Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        <View style={styles.notesSection}>
          <Text style={styles.notesHeader}>Notes :</Text>
          <Text style={styles.noteItem}>1. Payment is due within 30 days from the date of the invoice.</Text>
          <Text style={styles.noteItem}>2. Please make payment to the following bank account:</Text>
        </View>

        {/* Signatures */}
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
      </Page>
    </Document>
  );
};


export function Receipt({
  orderNumber,
  customer,
  cart,
  subtotal,
  overallDiscount,
  overallDiscountType,
  tax,
  total,
  paymentMethod,
  cashReceived,
  changeGiven,
  orderDate,
  notes,
  previousDue = 0,
  onClose
}: ReceiptProps) {
  const { formatCurrency } = useFormatting();
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadLogoAsBase64 = (logoUrl: string): Promise<string | null> => {
    return new Promise((resolve) => {
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
            resolve(base64);
          } else resolve(null);
        } catch (e) { resolve(null); }
      };
      img.onerror = () => resolve(null);
      img.src = logoUrl + (logoUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
    });
  };

  const loadSettings = async () => {
    try {
      const settings = await SettingsApi.getCompanySettings();
      setCompanySettings(settings);
      if (settings.invoice_logo) {
        const baseUrl = process.env.NEXT_PUBLIC_BACKEND_BASE_URL || 'http://localhost:9000';
        const logoUrl = settings.invoice_logo.startsWith('http') ? settings.invoice_logo : `${baseUrl}${settings.invoice_logo}`;
        const base64 = await loadLogoAsBase64(logoUrl);
        if (base64) setLogoBase64(base64);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrencySafe = (val: number) => {
    return formatCurrency(val).replace(/৳/g, 'TK');
  };

  const handleDownloadReceipt = async () => {
    if (loading) return;
    try {
      const blob = await pdf(
        <InvoicePDF 
          orderNumber={orderNumber}
          orderDate={orderDate}
          customer={customer}
          cart={cart}
          total={total}
          cashReceived={cashReceived}
          previousDue={previousDue}
          companySettings={companySettings}
          logoBase64={logoBase64}
          formatCurrency={formatCurrencySafe}
        />
      ).toBlob();
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${orderNumber}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      
      toast({ title: "Invoice Downloaded" });
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const handlePrintReceipt = async () => {
    if (loading) return;
    try {
      const blob = await pdf(
        <InvoicePDF 
          orderNumber={orderNumber}
          orderDate={orderDate}
          customer={customer}
          cart={cart}
          total={total}
          cashReceived={cashReceived}
          previousDue={previousDue}
          companySettings={companySettings}
          logoBase64={logoBase64}
          formatCurrency={formatCurrencySafe}
        />
      ).toBlob();
      
      const url = URL.createObjectURL(blob);
      window.open(url);
      toast({ title: "Invoice Printed" });
    } catch (error) {
      console.error('Error printing invoice:', error);
      toast({ title: "Error", variant: "destructive" });
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        <span>Preparing Invoice...</span>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Button 
        onClick={handlePrintReceipt}
        className="flex-1"
        variant="outline"
      >
        <Printer className="w-4 h-4 mr-2" />
        Print Invoice
      </Button>
      <Button 
        onClick={handleDownloadReceipt}
        className="flex-1"
        variant="outline"
      >
        <Download className="w-4 h-4 mr-2" />
        Download Invoice
      </Button>
    </div>
  );
}

