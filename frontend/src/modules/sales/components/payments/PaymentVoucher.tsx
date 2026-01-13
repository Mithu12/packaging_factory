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

interface Customer {
  id: number;
  name: string;
  email?: string;
  phone?: string;
}

interface PaymentVoucherProps {
  paymentId: number;
  customer: Customer;
  paymentAmount: number;
  paymentMethod: string;
  paymentDate: string;
  paymentReference?: string;
  notes?: string;
  previousDue?: number;
  remainingDue?: number;
  recordedBy?: string;
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
  voucherInfo: {
    fontSize: 9,
    color: '#333',
    marginBottom: 2,
  },
  divider: {
    borderBottom: '1pt solid #ccc',
    marginVertical: 10,
  },
  infoSection: {
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  infoLabel: {
    fontSize: 9,
    color: '#666',
    fontWeight: 'bold',
  },
  infoValue: {
    fontSize: 9,
    color: '#333',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1D357B',
    marginBottom: 8,
    marginTop: 10,
  },
  amountSection: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 4,
    marginTop: 10,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  amountLabel: {
    fontSize: 10,
    color: '#666',
  },
  amountValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#333',
  },
  totalAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1D357B',
    marginTop: 5,
  },
  footer: {
    marginTop: 30,
    paddingTop: 10,
    borderTop: '1pt solid #ccc',
    fontSize: 8,
    color: '#666',
    textAlign: 'center',
  },
  signatureLabel: {
    fontSize: 9,
  },
});

// PDF Document Component
const PaymentVoucherPDF = ({ 
  paymentId,
  customer, 
  paymentAmount,
  paymentMethod,
  paymentDate,
  paymentReference,
  notes,
  previousDue = 0,
  remainingDue = 0,
  recordedBy,
  companySettings, 
  logoBase64,
  formatCurrency
}: {
  paymentId: number;
  customer: Customer;
  paymentAmount: number;
  paymentMethod: string;
  paymentDate: string;
  paymentReference?: string;
  notes?: string;
  previousDue?: number;
  remainingDue?: number;
  recordedBy?: string;
  companySettings: CompanySettings | null;
  logoBase64: string | null;
  formatCurrency: (val: number) => string;
}) => {
  return (
    <Document title={`Payment-Voucher-${paymentId}`}>
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
            <Text style={styles.title}>PAYMENT VOUCHER</Text>
            <Text style={styles.voucherInfo}>Voucher No : PAY-{paymentId}</Text>
            <Text style={styles.voucherInfo}>
              Date : {new Date(paymentDate).toLocaleDateString('en-GB', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric' 
              }).replace(/\//g, '-')}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Customer Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Customer Name:</Text>
            <Text style={styles.infoValue}>{customer.name}</Text>
          </View>
          {customer.phone && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone:</Text>
              <Text style={styles.infoValue}>{customer.phone}</Text>
            </View>
          )}
          {customer.email && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email:</Text>
              <Text style={styles.infoValue}>{customer.email}</Text>
            </View>
          )}
        </View>

        {/* Payment Details Section */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Payment Details</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Payment Method:</Text>
            <Text style={styles.infoValue}>{paymentMethod.toUpperCase()}</Text>
          </View>
          {paymentReference && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Reference:</Text>
              <Text style={styles.infoValue}>{paymentReference}</Text>
            </View>
          )}
          {recordedBy && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Recorded By:</Text>
              <Text style={styles.infoValue}>{recordedBy}</Text>
            </View>
          )}
        </View>

        {/* Amount Section */}
        <View style={styles.amountSection}>
          {previousDue > 0 && (
            <View style={styles.amountRow}>
              <Text style={styles.amountLabel}>Previous Due Amount:</Text>
              <Text style={styles.amountValue}>{formatCurrency(previousDue)}</Text>
            </View>
          )}
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Payment Amount:</Text>
            <Text style={[styles.amountValue, { color: '#22c55e' }]}>{formatCurrency(paymentAmount)}</Text>
          </View>
          {remainingDue >= 0 && (
            <View style={styles.amountRow}>
              <Text style={styles.amountLabel}>Remaining Due:</Text>
              <Text style={[styles.amountValue, { color: remainingDue > 0 ? '#f97316' : '#22c55e' }]}>
                {formatCurrency(remainingDue)}
              </Text>
            </View>
          )}
          <View style={[styles.amountRow, { marginTop: 10, paddingTop: 10, borderTop: '1pt solid #ddd' }]}>
            <Text style={styles.totalAmount}>Total Paid: {formatCurrency(paymentAmount)}</Text>
          </View>
        </View>

        {/* Notes Section */}
        {notes && (
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.infoValue}>{notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>{companySettings?.company_name || 'ERP System'}</Text>
          {companySettings?.company_address && (
            <Text>{companySettings.company_address}</Text>
          )}
          {(companySettings?.company_phone || companySettings?.company_email) && (
            <Text>
              {companySettings?.company_phone && `Phone: ${companySettings.company_phone}`}
              {companySettings?.company_phone && companySettings?.company_email && ' | '}
              {companySettings?.company_email && `Email: ${companySettings.company_email}`}
            </Text>
          )}
          <Text style={{ marginTop: 10 }}>This is a computer-generated voucher.</Text>
        </View>
      </Page>
    </Document>
  );
};

export function PaymentVoucher({
  paymentId,
  customer,
  paymentAmount,
  paymentMethod,
  paymentDate,
  paymentReference,
  notes,
  previousDue = 0,
  remainingDue = 0,
  recordedBy,
  onClose
}: PaymentVoucherProps) {
  const [loading, setLoading] = useState(true);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const { formatCurrency } = useFormatting();

  useEffect(() => {
    loadCompanySettings();
  }, []);

  const loadCompanySettings = async () => {
    try {
      const settings = await SettingsApi.getCompanySettings();
      setCompanySettings(settings);
      
      if (settings?.company_logo) {
        try {
          const logoResponse = await fetch(settings.company_logo);
          const blob = await logoResponse.blob();
          const reader = new FileReader();
          reader.onloadend = () => {
            setLogoBase64(reader.result as string);
          };
          reader.readAsDataURL(blob);
        } catch (error) {
          console.error('Error loading logo:', error);
        }
      }
    } catch (error) {
      console.error('Error loading company settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrencyForPDF = (val: number) => {
    try {
      return formatCurrency(val);
    } catch {
      return `৳${val.toFixed(2)}`;
    }
  };

  const handleDownloadVoucher = async () => {
    if (loading) return;
    try {
      const blob = await pdf(
        <PaymentVoucherPDF 
          paymentId={paymentId}
          customer={customer}
          paymentAmount={paymentAmount}
          paymentMethod={paymentMethod}
          paymentDate={paymentDate}
          paymentReference={paymentReference}
          notes={notes}
          previousDue={previousDue}
          remainingDue={remainingDue}
          recordedBy={recordedBy}
          companySettings={companySettings}
          logoBase64={logoBase64}
          formatCurrency={formatCurrencyForPDF}
        />
      ).toBlob();
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `payment-voucher-${paymentId}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      toast({ title: "Voucher Downloaded" });
    } catch (error) {
      console.error('Error downloading voucher:', error);
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const handlePrintVoucher = async () => {
    if (loading) return;
    try {
      const blob = await pdf(
        <PaymentVoucherPDF 
          paymentId={paymentId}
          customer={customer}
          paymentAmount={paymentAmount}
          paymentMethod={paymentMethod}
          paymentDate={paymentDate}
          paymentReference={paymentReference}
          notes={notes}
          previousDue={previousDue}
          remainingDue={remainingDue}
          recordedBy={recordedBy}
          companySettings={companySettings}
          logoBase64={logoBase64}
          formatCurrency={formatCurrencyForPDF}
        />
      ).toBlob();
      
      const url = URL.createObjectURL(blob);
      window.open(url);
      toast({ title: "Payment Voucher Printed" });
    } catch (error) {
      console.error('Error printing voucher:', error);
      toast({ title: "Error", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        <span>Preparing Voucher...</span>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Button 
        onClick={handlePrintVoucher}
        className="flex-1"
        variant="outline"
      >
        <Printer className="w-4 h-4 mr-2" />
        Print Voucher
      </Button>
      <Button 
        onClick={handleDownloadVoucher}
        className="flex-1"
        variant="outline"
      >
        <Download className="w-4 h-4 mr-2" />
        Download Voucher
      </Button>
    </div>
  );
}
