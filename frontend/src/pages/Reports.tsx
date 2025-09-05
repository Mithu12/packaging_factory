import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  BarChart3, 
  Download, 
  Calendar,
  TrendingUp,
  Package,
  Users,
  ShoppingCart,
  DollarSign
} from "lucide-react"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

export default function Reports() {
  const reports = [
    {
      title: "Supplier Performance",
      description: "Analyze supplier delivery times, quality, and pricing",
      icon: Users,
      color: "bg-blue-100 text-blue-600",
      lastGenerated: "2024-01-15"
    },
    {
      title: "Inventory Valuation",
      description: "Current stock value and inventory turnover analysis",
      icon: Package,
      color: "bg-green-100 text-green-600",
      lastGenerated: "2024-01-14"
    },
    {
      title: "Purchase Order Summary",
      description: "PO trends, approval times, and order patterns",
      icon: ShoppingCart,
      color: "bg-purple-100 text-purple-600",
      lastGenerated: "2024-01-13"
    },
    {
      title: "Payment Analysis",
      description: "Outstanding payments, cash flow, and payment trends",
      icon: DollarSign,
      color: "bg-orange-100 text-orange-600",
      lastGenerated: "2024-01-12"
    }
  ]

  const quickStats = [
    { label: "Total Purchase Value", value: "$245,630", change: "+12.5%", trend: "up" },
    { label: "Active Suppliers", value: "42", change: "+3", trend: "up" },
    { label: "Pending Approvals", value: "8", change: "-2", trend: "down" },
    { label: "Low Stock Items", value: "15", change: "+5", trend: "up" }
  ]

  const recentReports = [
    {
      name: "Monthly Supplier Performance - December 2023",
      type: "Supplier Analysis",
      generatedDate: "2024-01-05",
      size: "2.4 MB",
      format: "PDF"
    },
    {
      name: "Inventory Valuation Report - Q4 2023", 
      type: "Inventory",
      generatedDate: "2024-01-03",
      size: "1.8 MB",
      format: "Excel"
    },
    {
      name: "Purchase Order Summary - December 2023",
      type: "Purchase Orders",
      generatedDate: "2024-01-02",
      size: "956 KB",
      format: "PDF"
    },
    {
      name: "Payment Analysis - December 2023",
      type: "Financial",
      generatedDate: "2024-01-01",
      size: "1.2 MB",
      format: "Excel"
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground">Generate insights and track performance across your operations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Calendar className="w-4 h-4 mr-2" />
            Schedule Report
          </Button>
          <Button className="bg-primary hover:bg-primary/90">
            <BarChart3 className="w-4 h-4 mr-2" />
            Custom Report
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {quickStats.map((stat, index) => (
          <Card key={index} className="bg-gradient-to-br from-card to-accent/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className={`text-xs flex items-center gap-1 ${
                stat.trend === "up" ? "text-success" : "text-destructive"
              }`}>
                <TrendingUp className="w-3 h-3" />
                {stat.change}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="generate" className="space-y-6">
        <TabsList>
          <TabsTrigger value="generate">Generate Reports</TabsTrigger>
          <TabsTrigger value="recent">Recent Reports</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled Reports</TabsTrigger>
        </TabsList>

        {/* Generate Reports Tab */}
        <TabsContent value="generate">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reports.map((report, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${report.color}`}>
                        <report.icon className="w-6 h-6" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{report.title}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">{report.description}</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Last generated: {report.lastGenerated}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Calendar className="w-4 h-4 mr-2" />
                        Schedule
                      </Button>
                      <Button size="sm" className="bg-primary hover:bg-primary/90">
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Generate
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Recent Reports Tab */}
        <TabsContent value="recent">
          <Card>
            <CardHeader>
              <CardTitle>Recently Generated Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentReports.map((report, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/20 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <BarChart3 className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{report.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {report.type} • Generated on {report.generatedDate}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-medium">{report.format}</div>
                        <div className="text-xs text-muted-foreground">{report.size}</div>
                      </div>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scheduled Reports Tab */}
        <TabsContent value="scheduled">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Scheduled Reports</CardTitle>
                <Button className="bg-primary hover:bg-primary/90">
                  <Calendar className="w-4 h-4 mr-2" />
                  New Schedule
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <div className="font-medium">Monthly Supplier Performance</div>
                      <div className="text-sm text-muted-foreground">
                        Runs on 1st of every month at 9:00 AM
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-success text-white">Active</Badge>
                    <Button variant="outline" size="sm">Edit</Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center">
                      <Package className="w-5 h-5 text-warning" />
                    </div>
                    <div>
                      <div className="font-medium">Weekly Inventory Summary</div>
                      <div className="text-sm text-muted-foreground">
                        Runs every Monday at 8:00 AM
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-success text-white">Active</Badge>
                    <Button variant="outline" size="sm">Edit</Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg opacity-60">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-muted/20 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="font-medium">Daily Payment Report</div>
                      <div className="text-sm text-muted-foreground">
                        Runs daily at 6:00 PM (Paused)
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Paused</Badge>
                    <Button variant="outline" size="sm">Resume</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}