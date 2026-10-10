"use client";

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';
import { CompanySettings } from '@/services/settings-types';
import { SupplierLedger } from '@/modules/inventory/services/supplier-ledger-api';

export interface SupplierLedgerPDFProps {
  ledger: SupplierLedger;
  companySettings: CompanySettings | null;
  logoBase64: string | null;
  formatCurrency: (val: number) => string;
  formatDate: (val: string) => string;
}

const styles = StyleSheet.create({
  page: { padding: 40, paddingBottom: 60, fontSize: 9, fontFamily: 'Helvetica', color: '#333', lineHeight: 1.5 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 15, borderBottomWidth: 2, borderBottomColor: '#1D357B', paddingBottom: 15,
  },
  logoSection: { width: '38%' },
  logo: { width: 120, height: 'auto', marginBottom: 5 },
  companyName: { fontSize: 18, fontWeight: 'bold', color: '#1D357B' },
  companyInfo: { fontSize: 8, color: '#666', marginTop: 3 },
  titleSection: { textAlign: 'right', width: '60%' },
  reportTitle: { fontSize: 20, fontWeight: 'bold', color: '#1D357B', marginBottom: 5, lineHeight: 1.1 },
  reportSubtitle: { fontSize: 10, color: '#666', marginBottom: 2 },
  dateRange: { fontSize: 9, color: '#333', marginTop: 5, backgroundColor: '#f3f4f6', padding: 5, borderRadius: 3 },
  supplierBox: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 5, padding: 10 },
  supplierName: { fontSize: 11, fontWeight: 'bold', color: '#111827' },
  supplierInfo: { fontSize: 8, color: '#555', marginTop: 2 },
  balanceLabel: { fontSize: 8, color: '#666', textAlign: 'right' },
  balanceValue: { fontSize: 13, fontWeight: 'bold', textAlign: 'right' },
  table: { marginTop: 15, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 5 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#1D357B', paddingVertical: 8, paddingHorizontal: 6 },
  tableHeaderCell: { color: '#ffffff', fontSize: 8, fontWeight: 'bold' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0', paddingVertical: 6, paddingHorizontal: 6, alignItems: 'center' },
  tableRowAlt: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0', paddingVertical: 6, paddingHorizontal: 6, alignItems: 'center', backgroundColor: '#f8fafc' },
  openingRow: { flexDirection: 'row', backgroundColor: '#fefce8', paddingVertical: 6, paddingHorizontal: 6, alignItems: 'center' },
  totalRow: { flexDirection: 'row', backgroundColor: '#eef2ff', paddingVertical: 8, paddingHorizontal: 6, alignItems: 'center' },
  tableCell: { fontSize: 8, color: '#374151' },
  tableCellBold: { fontSize: 8, color: '#111827', fontWeight: 'bold' },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 10 },
  footerText: { fontSize: 8, color: '#666' },
});

const col = StyleSheet.create({
  date: { width: '12%' },
  reference: { width: '16%' },
  description: { width: '30%' },
  debit: { width: '14%', textAlign: 'right' },
  credit: { width: '14%', textAlign: 'right' },
  balance: { width: '14%', textAlign: 'right' },
});

export const SupplierLedgerPDF = ({
  ledger,
  companySettings,
  logoBase64,
  formatCurrency,
  formatDate,
}: SupplierLedgerPDFProps) => {
  const generatedDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const { supplier, period, totals } = ledger;
  const periodLabel = period.start_date || period.end_date
    ? `${period.start_date ? formatDate(period.start_date) : 'Beginning'} – ${period.end_date ? formatDate(period.end_date) : 'Today'}`
    : 'All transactions';

  return (
    <Document title={`Supplier Ledger - ${supplier.name}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.logoSection}>
            {logoBase64 ? (
              <Image src={logoBase64} style={styles.logo} />
            ) : (
              <Text style={styles.companyName}>{companySettings?.company_name || 'ERP System'}</Text>
            )}
            <Text style={styles.companyInfo}>{companySettings?.company_address || ''}</Text>
            <Text style={styles.companyInfo}>{companySettings?.phone || ''} | {companySettings?.company_email || ''}</Text>
          </View>
          <View style={styles.titleSection}>
            <Text style={styles.reportTitle}>Supplier Ledger</Text>
            <Text style={styles.reportSubtitle}>Generated: {generatedDate}</Text>
            <Text style={styles.dateRange}>Period: {periodLabel}</Text>
          </View>
        </View>

        <View style={styles.supplierBox}>
          <View>
            <Text style={styles.supplierName}>{supplier.name} ({supplier.supplier_code})</Text>
            {supplier.contact_person ? <Text style={styles.supplierInfo}>Contact: {supplier.contact_person}</Text> : null}
            {supplier.phone || supplier.email ? (
              <Text style={styles.supplierInfo}>{[supplier.phone, supplier.email].filter(Boolean).join(' | ')}</Text>
            ) : null}
            {supplier.address ? <Text style={styles.supplierInfo}>{supplier.address}</Text> : null}
          </View>
          <View>
            <Text style={styles.balanceLabel}>Closing Balance (Payable)</Text>
            <Text style={[styles.balanceValue, { color: totals.closing_balance > 0 ? '#dc2626' : '#16a34a' }]}>
              {formatCurrency(totals.closing_balance)}
            </Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader} fixed>
            <Text style={[styles.tableHeaderCell, col.date]}>Date</Text>
            <Text style={[styles.tableHeaderCell, col.reference]}>Reference</Text>
            <Text style={[styles.tableHeaderCell, col.description]}>Description</Text>
            <Text style={[styles.tableHeaderCell, col.debit]}>Debit</Text>
            <Text style={[styles.tableHeaderCell, col.credit]}>Credit</Text>
            <Text style={[styles.tableHeaderCell, col.balance]}>Balance</Text>
          </View>
          <View style={styles.openingRow}>
            <Text style={[styles.tableCellBold, col.date]}>{period.start_date ? formatDate(period.start_date) : ''}</Text>
            <Text style={[styles.tableCell, col.reference]}>{' '}</Text>
            <Text style={[styles.tableCellBold, col.description]}>Opening Balance</Text>
            <Text style={[styles.tableCell, col.debit]}>{' '}</Text>
            <Text style={[styles.tableCell, col.credit]}>{' '}</Text>
            <Text style={[styles.tableCellBold, col.balance]}>{formatCurrency(ledger.opening_balance)}</Text>
          </View>
          {ledger.entries.map((e, index) => (
            <View key={`${e.entry_type}-${e.source_id}`} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt} wrap={false}>
              <Text style={[styles.tableCell, col.date]}>{formatDate(e.entry_date)}</Text>
              <Text style={[styles.tableCellBold, col.reference]}>{e.reference}</Text>
              <Text style={[styles.tableCell, col.description]}>{e.description}</Text>
              <Text style={[styles.tableCell, col.debit, { color: '#16a34a' }]}>{e.debit ? formatCurrency(e.debit) : '-'}</Text>
              <Text style={[styles.tableCell, col.credit, { color: '#dc2626' }]}>{e.credit ? formatCurrency(e.credit) : '-'}</Text>
              <Text style={[styles.tableCellBold, col.balance]}>{formatCurrency(e.balance)}</Text>
            </View>
          ))}
          <View style={styles.totalRow} wrap={false}>
            <Text style={[styles.tableCellBold, col.date]}>TOTAL</Text>
            <Text style={[styles.tableCellBold, col.reference]}>{' '}</Text>
            <Text style={[styles.tableCellBold, col.description]}>{ledger.entries.length} transactions</Text>
            <Text style={[styles.tableCellBold, col.debit]}>{formatCurrency(totals.total_debit)}</Text>
            <Text style={[styles.tableCellBold, col.credit]}>{formatCurrency(totals.total_credit)}</Text>
            <Text style={[styles.tableCellBold, col.balance, { color: totals.closing_balance > 0 ? '#dc2626' : '#16a34a' }]}>{formatCurrency(totals.closing_balance)}</Text>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>ERP System - Supplier Ledger</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
};
