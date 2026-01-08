"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, ChevronRight } from "lucide-react";
import Link from "next/link";

export default function SalesReportsPage() {
  const reports = [
    {
      id: 1,
      title: "Report 1",
      description: "Detailed sales performance and analytics report.",
      url: "/reports/sales-reports/report-1",
    },
    {
      id: 2,
      title: "Report 2",
      description: "Monthly revenue and trend analysis report.",
      url: "/reports/sales-reports/report-2",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Sales Reports</h1>
        <p className="text-muted-foreground">
          View and manage your sales reports and analytics.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => (
          <Link key={report.id} href={report.url}>
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer group">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {report.title}
                </CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {report.description}
                </p>
                <div className="mt-4 flex items-center text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  View Report
                  <ChevronRight className="ml-1 h-3 w-3" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
