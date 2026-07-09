"use client";

import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, BarChart3, Receipt } from "lucide-react";
import IncomeStatement from "@/modules/accounts/pages/IncomeStatement";
import BalanceSheet from "@/modules/accounts/pages/BalanceSheet";
import VatRegister from "@/modules/accounts/pages/VatRegister";

export default function FinancialReportPage() {
  return (
    <div className="flex-1 space-y-4">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Financial Report</h2>
        <p className="text-muted-foreground">Unified view of Income Statement, Balance Sheet, and VAT Register.</p>
      </div>

      <Tabs defaultValue="income-statement" className="space-y-4">
        <TabsList>
          <TabsTrigger value="income-statement" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Income Statement
          </TabsTrigger>
          <TabsTrigger value="balance-sheet" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Balance Sheet
          </TabsTrigger>
          <TabsTrigger value="vat-register" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            VAT Register
          </TabsTrigger>
        </TabsList>

        <TabsContent value="income-statement">
          <IncomeStatement />
        </TabsContent>

        <TabsContent value="balance-sheet">
          <BalanceSheet />
        </TabsContent>

        <TabsContent value="vat-register">
          <VatRegister />
        </TabsContent>
      </Tabs>
    </div>
  );
}
