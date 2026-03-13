"use client";

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import type { FactoryCustomerOrder } from "../services/customer-orders-api";
import type { CompanySettings } from "@/services/settings-types";
import { numberToWordsTaka } from "@/utils/numberToWords";

const styles = StyleSheet.create({
  page: {
    padding: 0,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#000",
    lineHeight: 1.4,
  },
  // Header with gradient-like area
  headerArea: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 40,
    paddingTop: 30,
    paddingBottom: 12,
    backgroundColor: "#E8F4FC",
  },
  logoSection: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  logo: {
    width: 80,
    height: 60,
  },
  logoTextBlock: {
    flexDirection: "column",
    marginLeft: 12,
  },
  companyName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 2,
    color: "#1a1a1a",
  },
  tagline: {
    fontSize: 9,
    color: "#555",
    fontStyle: "italic",
  },
  headerRight: {
    width: "40%",
    alignItems: "flex-end",
  },
  website: {
    fontSize: 9,
    color: "#333",
    marginBottom: 8,
  },
  stampCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: "#1D357B",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 16,
  },
  stampDate: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#1D357B",
  },
  mainTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 16,
    textDecoration: "underline",
    paddingHorizontal: 40,
  },
  mainContent: {
    paddingHorizontal: 40,
    paddingBottom: 12,
  },
  // Buyer/Supplier bordered block
  buyerSupplierBlock: {
    flexDirection: "row",
    borderWidth: 1.5,
    borderColor: "#000",
    marginBottom: 12,
  },
  buyerColumn: {
    width: "50%",
    padding: 10,
    borderRightWidth: 1,
    borderRightColor: "#000",
  },
  supplierColumn: {
    width: "50%",
    padding: 10,
  },
  columnLabel: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  infoLine: {
    marginBottom: 4,
    fontSize: 9,
  },
  introText: {
    marginBottom: 12,
    fontSize: 10,
  },
  // Table
  table: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#000",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    fontSize: 9,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#333",
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: "center",
    fontSize: 9,
  },
  colSno: { width: "8%", textAlign: "center" },
  colProduct: { width: "44%", paddingLeft: 4 },
  colQty: { width: "10%", textAlign: "center" },
  colPrice: { width: "18%", textAlign: "right", paddingRight: 4 },
  colAmount: { width: "20%", textAlign: "right", paddingRight: 4 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderTopWidth: 1,
    borderTopColor: "#000",
    backgroundColor: "#f9f9f9",
  },
  totalLabel: {
    width: "18%",
    textAlign: "right",
    fontWeight: "bold",
    marginRight: 8,
  },
  totalValue: {
    width: "20%",
    textAlign: "right",
    fontWeight: "bold",
  },
  amountInWords: {
    marginTop: 8,
    fontSize: 10,
    fontStyle: "italic",
    fontWeight: "bold",
  },
  termsSection: {
    marginTop: 16,
  },
  termsTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 8,
  },
  termItem: {
    marginBottom: 4,
    fontSize: 9,
  },
  bankSection: {
    marginTop: 12,
  },
  bankRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  bankLabel: {
    width: "45%",
    fontSize: 9,
  },
  bankValue: {
    width: "55%",
    fontSize: 9,
  },
  closingText: {
    marginTop: 12,
    fontSize: 10,
    fontStyle: "italic",
  },
  signatureSection: {
    marginTop: 24,
    flexDirection: "column",
  },
  signatureName: {
    fontSize: 11,
    fontWeight: "bold",
    marginTop: 4,
  },
  signatureTitle: {
    fontSize: 9,
    color: "#333",
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#1D357B",
    color: "#fff",
  },
  footerAddress: {
    fontSize: 8,
    color: "#fff",
    width: "50%",
  },
  footerContact: {
    fontSize: 8,
    color: "#fff",
    textAlign: "right",
  },
  footerContactBlock: {
    width: "50%",
    alignItems: "flex-end",
  },
  footerSpacer: {
    height: 50,
  },
});

function formatAddress(addr?: {
  street?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}): string {
  if (!addr) return "";
  const parts = [
    addr.street,
    [addr.city, addr.state].filter(Boolean).join(", "),
    addr.postal_code,
    addr.country,
  ].filter(Boolean);
  return parts.join(", ");
}

function formatDateDDMMYYYY(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  } catch {
    return dateStr;
  }
}

const DEFAULT_TERMS = (companyName: string) => [
  "Price Excluding TAX & Vat.",
  "50% in advance and rest of payment will be Bank Transfer.",
  `Payment should be made by Cash/Cash Cheque on behalf of ${companyName} or Bank Transfer.`,
  "Delivery will be confirm within 10 working days after getting the approval.",
];

export interface QuotationPDFProps {
  order: FactoryCustomerOrder;
  companySettings: CompanySettings | null;
  logoBase64: string | null;
  formatCurrency: (n: number) => string;
}

export function QuotationPDF({
  order,
  companySettings,
  logoBase64,
  formatCurrency,
}: QuotationPDFProps) {
  const companyName = companySettings?.company_name || "Company";
  const termsText = order.terms?.trim();
  const terms = termsText
    ? termsText.split(/\n+/).filter(Boolean)
    : DEFAULT_TERMS(companyName);

  const buyerAddress = formatAddress(order.billing_address);

  const hasBankInfo =
    companySettings?.account_name ||
    companySettings?.account_number ||
    companySettings?.bank_name;

  const signatureName =
    (companySettings as any)?.quotation_signature_name || companyName;
  const signatureTitle =
    (companySettings as any)?.quotation_signature_title || "Authorized Signatory";

  const footerAddress =
    companySettings?.company_address || "";
  const footerPhones = [
    companySettings?.phone,
    (companySettings as any)?.company_secondary_phone,
  ]
    .filter(Boolean)
    .join(" | ");
  const footerEmail = companySettings?.company_email || "";
  const footerFacebook = companySettings?.facebook_url || (companySettings as any)?.company_facebook || "";

  return (
    <Document title={`Quotation-${order.order_number}`}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerArea}>
          <View style={styles.logoSection}>
            {logoBase64 ? (
              <Image src={logoBase64} style={styles.logo} />
            ) : null}
            <View style={styles.logoTextBlock}>
              {!logoBase64 && (
                <Text style={styles.companyName}>{companyName}</Text>
              )}
              <Text style={styles.tagline}>YOUR ONE-STOP PRINTSHOP</Text>
            </View>
            <View style={styles.stampCircle}>
              <Text style={styles.stampDate}>
                {formatDateDDMMYYYY(order.order_date)}
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            {(companySettings?.website || companySettings?.company_email) && (
              <Text style={styles.website}>
                {companySettings.website || companySettings.company_email}
              </Text>
            )}
          </View>
        </View>

        {/* Main title - centered */}
        <Text style={styles.mainTitle}>Quotation for Gift Items</Text>

        <View style={styles.mainContent}>
          {/* Buyer and Supplier - bordered block */}
          <View style={styles.buyerSupplierBlock}>
            <View style={styles.buyerColumn}>
              <Text style={styles.columnLabel}>BUYER</Text>
              <Text style={styles.infoLine}>
                To, {order.factory_customer_name}
              </Text>
              {order.factory_customer_phone && (
                <Text style={styles.infoLine}>
                  Phone: {order.factory_customer_phone}
                </Text>
              )}
              {buyerAddress ? (
                <Text style={styles.infoLine}>Address: {buyerAddress}</Text>
              ) : null}
              {order.factory_customer_email && (
                <Text style={styles.infoLine}>
                  Email: {order.factory_customer_email}
                </Text>
              )}
            </View>
            <View style={styles.supplierColumn}>
              <Text style={styles.columnLabel}>SUPPLIER</Text>
              <Text style={styles.infoLine}>M/S {companyName}</Text>
              {companySettings?.company_address && (
                <Text style={styles.infoLine}>
                  Address: {companySettings.company_address}
                </Text>
              )}
              {(companySettings?.tax_id || (companySettings as any)?.etin) && (
                <Text style={styles.infoLine}>
                  E-TIN-{companySettings.tax_id || (companySettings as any).etin}
                </Text>
              )}
              {(companySettings as any)?.vat_registration && (
                <Text style={styles.infoLine}>
                  VAT REGISTRATION NO-{(companySettings as any).vat_registration}
                </Text>
              )}
              {companySettings?.phone && (
                <Text style={styles.infoLine}>
                  Mobile: {companySettings.phone}
                </Text>
              )}
              {(companySettings?.website || companySettings?.company_email) && (
                <Text style={styles.infoLine}>
                  Web: {companySettings.website || companySettings.company_email}
                </Text>
              )}
            </View>
          </View>

          {/* Intro */}
          <Text style={styles.introText}>
            Dear Sir, As per discussion, we are pleased to submit the quotation
            of the following items:
          </Text>

          {/* Items Table */}
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={styles.colSno}>S.no</Text>
              <Text style={styles.colProduct}>Name of the Product</Text>
              <Text style={styles.colQty}>Qty</Text>
              <Text style={styles.colPrice}>U.Price</Text>
              <Text style={styles.colAmount}>Amount (Tk.)</Text>
            </View>
            {order.line_items.map((item, index) => (
              <View key={item.id || index} style={styles.tableRow}>
                <Text style={styles.colSno}>
                  {String(index + 1).padStart(2, "0")}.
                </Text>
                <Text style={styles.colProduct}>
                  {item.product_name || item.notes || "—"}
                </Text>
                <Text style={styles.colQty}>{item.quantity}</Text>
                <Text style={styles.colPrice}>
                  {formatCurrency(item.unit_price)}
                </Text>
                <Text style={styles.colAmount}>
                  {formatCurrency(
                    item.total_price ?? item.quantity * item.unit_price
                  )}
                </Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(order.total_value)}
              </Text>
            </View>
          </View>

          <Text style={styles.amountInWords}>
            In Word: {numberToWordsTaka(order.total_value)}
          </Text>

          {/* Terms & Conditions */}
          <View style={styles.termsSection}>
            <Text style={styles.termsTitle}>Terms & Condition</Text>
            {terms.map((t, i) => (
              <Text key={i} style={styles.termItem}>
                {i + 1}. {t}
              </Text>
            ))}
          </View>

          {/* Account Information */}
          {hasBankInfo && (
            <View style={styles.bankSection}>
              {companySettings?.account_name && (
                <View style={styles.bankRow}>
                  <Text style={styles.bankLabel}>Account Name:</Text>
                  <Text style={styles.bankValue}>
                    {companySettings.account_name}
                  </Text>
                </View>
              )}
              {companySettings?.account_number && (
                <View style={styles.bankRow}>
                  <Text style={styles.bankLabel}>Account Number:</Text>
                  <Text style={styles.bankValue}>
                    {companySettings.account_number}
                  </Text>
                </View>
              )}
              {companySettings?.bank_name && (
                <View style={styles.bankRow}>
                  <Text style={styles.bankLabel}>Bank Name:</Text>
                  <Text style={styles.bankValue}>
                    {companySettings.bank_name}
                  </Text>
                </View>
              )}
              {companySettings?.bank_branch && (
                <View style={styles.bankRow}>
                  <Text style={styles.bankLabel}>Branch:</Text>
                  <Text style={styles.bankValue}>
                    {companySettings.bank_branch}
                  </Text>
                </View>
              )}
              {companySettings?.routing_number && (
                <View style={styles.bankRow}>
                  <Text style={styles.bankLabel}>Routing Number:</Text>
                  <Text style={styles.bankValue}>
                    {companySettings.routing_number}
                  </Text>
                </View>
              )}
            </View>
          )}

          <Text style={styles.closingText}>
            Your kind Co-operation in this regard will be highly Appreciate.
          </Text>

          {/* Signature */}
          <View style={styles.signatureSection}>
            <Text style={styles.signatureName}>{signatureName}</Text>
            <Text style={styles.signatureTitle}>{signatureTitle}</Text>
            <Text style={styles.signatureTitle}>{companyName}</Text>
          </View>
        </View>

        {/* Footer spacer so content doesn't overlap footer */}
        <View style={styles.footerSpacer} />

        {/* Footer - blue band */}
        <View style={styles.footer}>
          <Text style={styles.footerAddress}>{footerAddress}</Text>
          <View style={styles.footerContactBlock}>
            {footerPhones ? (
              <Text style={styles.footerContact}>{footerPhones}</Text>
            ) : null}
            {footerEmail ? (
              <Text style={styles.footerContact}>{footerEmail}</Text>
            ) : null}
            {footerFacebook ? (
              <Text style={styles.footerContact}>{footerFacebook}</Text>
            ) : null}
          </View>
        </View>
      </Page>
    </Document>
  );
}
