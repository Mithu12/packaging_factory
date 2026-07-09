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
import { CompanySettings } from "@/services/settings-types";
import {
  ProductionSummary,
  WorkOrderRow,
  ProductionRunRow,
  LineUtilizationRow,
  WastageReport,
} from "@/modules/factory/services/production-report-api";

export interface ProductionReportPDFProps {
  dateRange?: { from?: string; to?: string };
  companySettings: CompanySettings | null;
  logoBase64: string | null;
  summary: ProductionSummary | null;
  workOrders: WorkOrderRow[];
  runs: ProductionRunRow[];
  lines: LineUtilizationRow[];
  wastage: WastageReport | null;
  activeTab: string;
  formatCurrency: (val: number) => string;
}

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 9, fontFamily: "Helvetica", color: "#333", lineHeight: 1.5 },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    marginBottom: 20, borderBottomWidth: 2, borderBottomColor: "#1D357B", paddingBottom: 15,
  },
  logoSection: { width: "38%" },
  logo: { width: 120, height: "auto", marginBottom: 5 },
  companyName: { fontSize: 18, fontWeight: "bold", color: "#1D357B" },
  companyInfo: { fontSize: 8, color: "#666", marginTop: 3 },
  titleSection: { textAlign: "right", width: "60%" },
  reportTitle: { fontSize: 20, fontWeight: "bold", color: "#1D357B", marginBottom: 5, lineHeight: 1.1 },
  reportSubtitle: { fontSize: 10, color: "#666", marginBottom: 2 },
  dateRange: { fontSize: 9, color: "#333", marginTop: 5, backgroundColor: "#f3f4f6", padding: 5, borderRadius: 3 },
  section: { marginTop: 20, marginBottom: 10 },
  sectionTitle: { fontSize: 14, fontWeight: "bold", color: "#1D357B", marginBottom: 10 },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 15 },
  summaryCard: { width: "30%", padding: 10, backgroundColor: "#f8fafc", borderRadius: 5, borderWidth: 1, borderColor: "#e2e8f0" },
  summaryLabel: { fontSize: 8, color: "#666", marginBottom: 3 },
  summaryValue: { fontSize: 14, fontWeight: "bold", color: "#1D357B" },
  table: { marginTop: 10, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 5 },
  tableHeader: { flexDirection: "row", backgroundColor: "#1D357B", paddingVertical: 8, paddingHorizontal: 6 },
  tableHeaderCell: { color: "#ffffff", fontSize: 8, fontWeight: "bold" },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#e2e8f0", paddingVertical: 6, paddingHorizontal: 6, alignItems: "center" },
  tableRowAlt: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#e2e8f0", paddingVertical: 6, paddingHorizontal: 6, alignItems: "center", backgroundColor: "#f8fafc" },
  totalRow: { flexDirection: "row", backgroundColor: "#eef2ff", paddingVertical: 8, paddingHorizontal: 6, alignItems: "center" },
  tableCell: { fontSize: 8, color: "#374151" },
  tableCellBold: { fontSize: 8, color: "#111827", fontWeight: "bold" },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 10 },
  footerText: { fontSize: 8, color: "#666" },
});

const sCol = StyleSheet.create({
  num: { width: "8%", textAlign: "center" },
  wo: { width: "16%" },
  product: { width: "18%" },
  sku: { width: "12%" },
  target: { width: "10%", textAlign: "right" },
  produced: { width: "10%", textAlign: "right" },
  good: { width: "10%", textAlign: "right" },
  rejected: { width: "8%", textAlign: "right" },
  status: { width: "8%", textAlign: "center" },
});

const rCol = StyleSheet.create({
  num: { width: "8%", textAlign: "center" },
  run: { width: "14%" },
  wo: { width: "14%" },
  product: { width: "16%" },
  target: { width: "10%", textAlign: "right" },
  produced: { width: "10%", textAlign: "right" },
  efficiency: { width: "10%", textAlign: "right" },
  quality: { width: "10%", textAlign: "right" },
  status: { width: "8%", textAlign: "center" },
});

const lCol = StyleSheet.create({
  name: { width: "20%" },
  code: { width: "12%" },
  capacity: { width: "12%", textAlign: "right" },
  runs: { width: "12%", textAlign: "right" },
  produced: { width: "14%", textAlign: "right" },
  efficiency: { width: "14%", textAlign: "right" },
  utilization: { width: "12%", textAlign: "right" },
});

const statusColor = (status: string): string => {
  switch (status) {
    case "completed": return "#16a34a";
    case "in_progress": return "#2563eb";
    case "on_hold": return "#d97706";
    case "cancelled": return "#dc2626";
    default: return "#6b7280";
  }
};

const priorityColor = (p: string): string => {
  switch (p) {
    case "urgent": return "#dc2626";
    case "high": return "#ea580c";
    case "medium": return "#2563eb";
    default: return "#6b7280";
  }
};

export const ProductionReportPDF = ({
  dateRange,
  companySettings,
  logoBase64,
  summary,
  workOrders,
  runs,
  lines,
  wastage,
  activeTab,
  formatCurrency,
}: ProductionReportPDFProps) => {
  const generatedDate = new Date().toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  const renderSummaryTab = () => {
    if (!summary) return null;
    return (
      <View>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Work Orders</Text>
            <Text style={styles.summaryValue}>{summary.total_work_orders}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Completed</Text>
            <Text style={[styles.summaryValue, { color: "#16a34a" }]}>{summary.completed_orders}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>In Progress</Text>
            <Text style={[styles.summaryValue, { color: "#2563eb" }]}>{summary.in_progress_orders}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Completion Rate</Text>
            <Text style={styles.summaryValue}>{summary.completion_rate.toFixed(1)}%</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Produced</Text>
            <Text style={styles.summaryValue}>{summary.total_produced.toLocaleString()}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Avg Efficiency</Text>
            <Text style={styles.summaryValue}>{summary.avg_efficiency.toFixed(1)}%</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Rejected</Text>
            <Text style={[styles.summaryValue, { color: "#dc2626" }]}>{summary.total_rejected.toLocaleString()}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Rejection Rate</Text>
            <Text style={[styles.summaryValue, { color: "#dc2626" }]}>{summary.rejection_rate.toFixed(1)}%</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Avg Quality</Text>
            <Text style={styles.summaryValue}>{summary.avg_quality.toFixed(1)}%</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderWorkOrdersTab = () => (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderCell, sCol.num]}>#</Text>
        <Text style={[styles.tableHeaderCell, sCol.wo]}>Work Order</Text>
        <Text style={[styles.tableHeaderCell, sCol.product]}>Product</Text>
        <Text style={[styles.tableHeaderCell, sCol.target]}>Target</Text>
        <Text style={[styles.tableHeaderCell, sCol.produced]}>Produced</Text>
        <Text style={[styles.tableHeaderCell, sCol.good]}>Good</Text>
        <Text style={[styles.tableHeaderCell, sCol.rejected]}>Rejected</Text>
        <Text style={[styles.tableHeaderCell, sCol.status]}>Status</Text>
      </View>
      {workOrders.map((wo, i) => (
        <View key={wo.id} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
          <Text style={[styles.tableCell, sCol.num]}>{i + 1}</Text>
          <Text style={[styles.tableCellBold, sCol.wo]}>{wo.work_order_number}</Text>
          <Text style={[styles.tableCell, sCol.product]}>{wo.product_name}</Text>
          <Text style={[styles.tableCell, sCol.target]}>{wo.target_quantity}</Text>
          <Text style={[styles.tableCell, sCol.produced]}>{wo.produced_quantity}</Text>
          <Text style={[styles.tableCell, sCol.good, { color: "#16a34a" }]}>{wo.good_quantity}</Text>
          <Text style={[styles.tableCell, sCol.rejected, { color: "#dc2626" }]}>{wo.rejected_quantity}</Text>
          <Text style={[styles.tableCellBold, sCol.status, { color: statusColor(wo.status) }]}>{wo.status.toUpperCase()}</Text>
        </View>
      ))}
    </View>
  );

  const renderRunsTab = () => (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderCell, rCol.num]}>#</Text>
        <Text style={[styles.tableHeaderCell, rCol.run]}>Run #</Text>
        <Text style={[styles.tableHeaderCell, rCol.wo]}>Work Order</Text>
        <Text style={[styles.tableHeaderCell, rCol.product]}>Product</Text>
        <Text style={[styles.tableHeaderCell, rCol.target]}>Target</Text>
        <Text style={[styles.tableHeaderCell, rCol.produced]}>Produced</Text>
        <Text style={[styles.tableHeaderCell, rCol.efficiency]}>Efficiency</Text>
        <Text style={[styles.tableHeaderCell, rCol.quality]}>Quality</Text>
        <Text style={[styles.tableHeaderCell, rCol.status]}>Status</Text>
      </View>
      {runs.map((r, i) => (
        <View key={r.id} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
          <Text style={[styles.tableCell, rCol.num]}>{i + 1}</Text>
          <Text style={[styles.tableCellBold, rCol.run]}>{r.run_number}</Text>
          <Text style={[styles.tableCell, rCol.wo]}>{r.work_order_number}</Text>
          <Text style={[styles.tableCell, rCol.product]}>{r.product_name}</Text>
          <Text style={[styles.tableCell, rCol.target]}>{r.target_quantity}</Text>
          <Text style={[styles.tableCell, rCol.produced]}>{r.produced_quantity}</Text>
          <Text style={[styles.tableCell, rCol.efficiency]}>{r.efficiency_percentage.toFixed(1)}%</Text>
          <Text style={[styles.tableCell, rCol.quality]}>{r.quality_percentage.toFixed(1)}%</Text>
          <Text style={[styles.tableCellBold, rCol.status, { color: statusColor(r.status) }]}>{r.status.toUpperCase()}</Text>
        </View>
      ))}
    </View>
  );

  const renderLinesTab = () => (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderCell, lCol.name]}>Line Name</Text>
        <Text style={[styles.tableHeaderCell, lCol.code]}>Code</Text>
        <Text style={[styles.tableHeaderCell, lCol.capacity]}>Capacity</Text>
        <Text style={[styles.tableHeaderCell, lCol.runs]}>Runs</Text>
        <Text style={[styles.tableHeaderCell, lCol.produced]}>Produced</Text>
        <Text style={[styles.tableHeaderCell, lCol.efficiency]}>Avg Efficiency</Text>
        <Text style={[styles.tableHeaderCell, lCol.utilization]}>Utilization</Text>
      </View>
      {lines.map((l, i) => (
        <View key={l.id} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
          <Text style={[styles.tableCellBold, lCol.name]}>{l.name}</Text>
          <Text style={[styles.tableCell, lCol.code]}>{l.code}</Text>
          <Text style={[styles.tableCell, lCol.capacity]}>{l.capacity}</Text>
          <Text style={[styles.tableCell, lCol.runs]}>{l.total_runs}</Text>
          <Text style={[styles.tableCell, lCol.produced]}>{l.total_produced}</Text>
          <Text style={[styles.tableCell, lCol.efficiency]}>{l.avg_efficiency.toFixed(1)}%</Text>
          <Text style={[styles.tableCell, lCol.utilization]}>{l.utilization_rate.toFixed(1)}%</Text>
        </View>
      ))}
    </View>
  );

  const renderWastageTab = () => {
    if (!wastage) return null;
    return (
      <View>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Wastage Records</Text>
            <Text style={styles.summaryValue}>{wastage.totals.total_records}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Wastage Cost</Text>
            <Text style={[styles.summaryValue, { color: "#dc2626" }]}>{formatCurrency(wastage.totals.total_cost)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Pending Approval</Text>
            <Text style={[styles.summaryValue, { color: "#d97706" }]}>{wastage.totals.pending_count}</Text>
          </View>
        </View>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: "22%" }]}>Material</Text>
            <Text style={[styles.tableHeaderCell, { width: "22%" }]}>Reason</Text>
            <Text style={[styles.tableHeaderCell, { width: "12%", textAlign: "right" }]}>Records</Text>
            <Text style={[styles.tableHeaderCell, { width: "12%", textAlign: "right" }]}>Quantity</Text>
            <Text style={[styles.tableHeaderCell, { width: "16%", textAlign: "right" }]}>Cost</Text>
            <Text style={[styles.tableHeaderCell, { width: "12%", textAlign: "center" }]}>Status</Text>
          </View>
          {wastage.wastage.map((w, i) => (
            <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={[styles.tableCell, { width: "22%" }]}>{w.material_name}</Text>
              <Text style={[styles.tableCell, { width: "22%" }]}>{w.wastage_reason}</Text>
              <Text style={[styles.tableCell, { width: "12%", textAlign: "right" }]}>{w.record_count}</Text>
              <Text style={[styles.tableCell, { width: "12%", textAlign: "right" }]}>{w.total_quantity}</Text>
              <Text style={[styles.tableCellBold, { width: "16%", textAlign: "right", color: "#dc2626" }]}>{formatCurrency(w.total_cost)}</Text>
              <Text style={[styles.tableCell, { width: "12%", textAlign: "center", color: statusColor(w.status) }]}>{w.status}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const tabTitles: Record<string, string> = {
    summary: "Production Summary",
    workOrders: "Work Orders",
    runs: "Production Runs",
    lines: "Line Utilization",
    wastage: "Wastage Summary",
  };

  return (
    <Document title="Production Report">
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.logoSection}>
            {logoBase64 ? (
              <Image src={logoBase64} style={styles.logo} />
            ) : (
              <Text style={styles.companyName}>{companySettings?.company_name || "ERP System"}</Text>
            )}
            <Text style={styles.companyInfo}>{companySettings?.company_address || ""}</Text>
            <Text style={styles.companyInfo}>{companySettings?.phone || ""} | {companySettings?.company_email || ""}</Text>
          </View>
          <View style={styles.titleSection}>
            <Text style={styles.reportTitle}>Production Report</Text>
            <Text style={styles.reportSubtitle}>{tabTitles[activeTab] || "Production Summary"}</Text>
            <Text style={styles.reportSubtitle}>Generated: {generatedDate}</Text>
            {dateRange?.from && (
              <Text style={styles.dateRange}>
                Period: {dateRange.from}{dateRange.to ? ` to ${dateRange.to}` : ""}
              </Text>
            )}
          </View>
        </View>

        {activeTab === "summary" && renderSummaryTab()}
        {activeTab === "workOrders" && renderWorkOrdersTab()}
        {activeTab === "runs" && renderRunsTab()}
        {activeTab === "lines" && renderLinesTab()}
        {activeTab === "wastage" && renderWastageTab()}

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>ERP System - Production Report</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
};
