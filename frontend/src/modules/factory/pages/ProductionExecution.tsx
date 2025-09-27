import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Play,
  Pause,
  Square,
  Clock,
  Package,
  Users,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Activity,
  Zap,
  Target,
  Timer,
  BarChart3,
} from "lucide-react";
import { useFormatting } from "@/hooks/useFormatting";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

interface ProductionRun {
  id: string;
  workOrderId: string;
  product: string;
  quantity: number;
  status: "running" | "paused" | "stopped" | "completed";
  startTime: string;
  endTime?: string;
  duration: number; // in minutes
  output: number;
  targetOutput: number;
  efficiency: number;
  operator: string;
  productionLine: string;
  downtime: number; // in minutes
  downtimeReasons: string[];
}

interface DowntimeReason {
  id: string;
  reason: string;
  duration: number;
  timestamp: string;
}

interface ProductionStats {
  totalRuns: number;
  activeRuns: number;
  completedToday: number;
  averageEfficiency: number;
  totalDowntime: number;
  onTimeDelivery: number;
}

export default function ProductionExecution() {
  const { formatCurrency, formatDate } = useFormatting();
  const [productionRuns, setProductionRuns] = useState<ProductionRun[]>([]);
  const [stats, setStats] = useState<ProductionStats>({
    totalRuns: 0,
    activeRuns: 0,
    completedToday: 0,
    averageEfficiency: 0,
    totalDowntime: 0,
    onTimeDelivery: 0,
  });
  const [selectedRun, setSelectedRun] = useState<ProductionRun | null>(null);
  const [showRunDetails, setShowRunDetails] = useState(false);
  const [showDowntimeDialog, setShowDowntimeDialog] = useState(false);
  const [downtimeReason, setDowntimeReason] = useState("");
  const [downtimeDuration, setDowntimeDuration] = useState(0);

  useEffect(() => {
    // Mock data - in real app, fetch from API
    setProductionRuns([
      {
        id: "RUN-001",
        workOrderId: "WO-001",
        product: "Premium Widget A",
        quantity: 500,
        status: "running",
        startTime: "2024-03-10T08:00:00Z",
        duration: 240, // 4 hours
        output: 320,
        targetOutput: 400,
        efficiency: 80,
        operator: "John Doe",
        productionLine: "Line 1",
        downtime: 30,
        downtimeReasons: ["Machine maintenance", "Material shortage"],
      },
      {
        id: "RUN-002",
        workOrderId: "WO-002",
        product: "Standard Widget B",
        quantity: 1000,
        status: "paused",
        startTime: "2024-03-10T10:00:00Z",
        duration: 120,
        output: 150,
        targetOutput: 200,
        efficiency: 75,
        operator: "Jane Smith",
        productionLine: "Line 2",
        downtime: 15,
        downtimeReasons: ["Quality check"],
      },
      {
        id: "RUN-003",
        workOrderId: "WO-003",
        product: "Custom Widget C",
        quantity: 250,
        status: "completed",
        startTime: "2024-03-09T14:00:00Z",
        endTime: "2024-03-09T18:00:00Z",
        duration: 240,
        output: 250,
        targetOutput: 250,
        efficiency: 100,
        operator: "Mike Johnson",
        productionLine: "Line 3",
        downtime: 0,
        downtimeReasons: [],
      },
    ]);

    setStats({
      totalRuns: 15,
      activeRuns: 2,
      completedToday: 8,
      averageEfficiency: 87,
      totalDowntime: 45,
      onTimeDelivery: 92,
    });
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running":
        return "bg-green-100 text-green-800";
      case "paused":
        return "bg-yellow-100 text-yellow-800";
      case "stopped":
        return "bg-red-100 text-red-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "running":
        return <Play className="h-4 w-4 text-green-600" />;
      case "paused":
        return <Pause className="h-4 w-4 text-yellow-600" />;
      case "stopped":
        return <Square className="h-4 w-4 text-red-600" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-blue-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const handleStartRun = (runId: string) => {
    setProductionRuns((prev) =>
      prev.map((run) =>
        run.id === runId ? { ...run, status: "running" as const } : run
      )
    );
  };

  const handlePauseRun = (runId: string) => {
    setProductionRuns((prev) =>
      prev.map((run) =>
        run.id === runId ? { ...run, status: "paused" as const } : run
      )
    );
  };

  const handleStopRun = (runId: string) => {
    setProductionRuns((prev) =>
      prev.map((run) =>
        run.id === runId ? { ...run, status: "stopped" as const } : run
      )
    );
  };

  const handleCompleteRun = (runId: string) => {
    setProductionRuns((prev) =>
      prev.map((run) =>
        run.id === runId
          ? {
              ...run,
              status: "completed" as const,
              endTime: new Date().toISOString(),
            }
          : run
      )
    );
  };

  const handleRecordDowntime = (runId: string) => {
    setSelectedRun(productionRuns.find((run) => run.id === runId) || null);
    setShowDowntimeDialog(true);
  };

  const handleSubmitDowntime = () => {
    if (selectedRun && downtimeReason && downtimeDuration > 0) {
      setProductionRuns((prev) =>
        prev.map((run) =>
          run.id === selectedRun.id
            ? {
                ...run,
                downtime: run.downtime + downtimeDuration,
                downtimeReasons: [...run.downtimeReasons, downtimeReason],
              }
            : run
        )
      );
      setShowDowntimeDialog(false);
      setDowntimeReason("");
      setDowntimeDuration(0);
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Production Execution</h1>
          <p className="text-muted-foreground">
            Monitor and control production runs in real-time
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
          <Button>
            <Play className="h-4 w-4 mr-2" />
            Start New Run
          </Button>
        </div>
      </div>

      {/* Production Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Runs</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeRuns}</div>
            <p className="text-xs text-muted-foreground">Currently running</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Completed Today
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedToday}</div>
            <p className="text-xs text-muted-foreground">Production runs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Average Efficiency
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageEfficiency}%</div>
            <p className="text-xs text-muted-foreground">
              Production efficiency
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Downtime
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(stats.totalDowntime)}
            </div>
            <p className="text-xs text-muted-foreground">Today's downtime</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="active-runs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active-runs">Active Runs</TabsTrigger>
          <TabsTrigger value="completed-runs">Completed Runs</TabsTrigger>
          <TabsTrigger value="downtime">Downtime Tracking</TabsTrigger>
        </TabsList>

        <TabsContent value="active-runs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Production Runs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {productionRuns
                  .filter(
                    (run) => run.status === "running" || run.status === "paused"
                  )
                  .map((run) => (
                    <Card key={run.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(run.status)}
                            <div>
                              <h3 className="font-medium">{run.product}</h3>
                              <p className="text-sm text-muted-foreground">
                                {run.workOrderId} • {run.productionLine} •{" "}
                                {run.operator}
                              </p>
                            </div>
                          </div>
                          <Badge className={getStatusColor(run.status)}>
                            {run.status.toUpperCase()}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <Label className="text-sm font-medium">
                              Output
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              {run.output} / {run.targetOutput}
                            </p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">
                              Duration
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              {formatDuration(run.duration)}
                            </p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">
                              Efficiency
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              {run.efficiency}%
                            </p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">
                              Downtime
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              {formatDuration(run.downtime)}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2 mb-4">
                          <div className="flex justify-between text-sm">
                            <span>Progress</span>
                            <span>
                              {Math.round(
                                (run.output / run.targetOutput) * 100
                              )}
                              %
                            </span>
                          </div>
                          <Progress
                            value={(run.output / run.targetOutput) * 100}
                            className="h-2"
                          />
                        </div>

                        <div className="flex gap-2">
                          {run.status === "running" && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePauseRun(run.id)}
                              >
                                <Pause className="h-4 w-4 mr-2" />
                                Pause
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStopRun(run.id)}
                              >
                                <Square className="h-4 w-4 mr-2" />
                                Stop
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCompleteRun(run.id)}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Complete
                              </Button>
                            </>
                          )}
                          {run.status === "paused" && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleStartRun(run.id)}
                              >
                                <Play className="h-4 w-4 mr-2" />
                                Resume
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStopRun(run.id)}
                              >
                                <Square className="h-4 w-4 mr-2" />
                                Stop
                              </Button>
                            </>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRecordDowntime(run.id)}
                          >
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            Record Downtime
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed-runs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Completed Production Runs</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Run ID</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Output</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Efficiency</TableHead>
                    <TableHead>Operator</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productionRuns
                    .filter((run) => run.status === "completed")
                    .map((run) => (
                      <TableRow key={run.id}>
                        <TableCell className="font-medium">{run.id}</TableCell>
                        <TableCell>{run.product}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{run.output}</div>
                            <div className="text-sm text-muted-foreground">
                              Target: {run.targetOutput}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{formatDuration(run.duration)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${run.efficiency}%` }}
                              />
                            </div>
                            <span className="text-sm">{run.efficiency}%</span>
                          </div>
                        </TableCell>
                        <TableCell>{run.operator}</TableCell>
                        <TableCell>
                          {run.endTime ? formatDate(run.endTime) : "N/A"}
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            <Activity className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="downtime" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Downtime Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {productionRuns
                  .filter((run) => run.downtime > 0)
                  .map((run) => (
                    <Card key={run.id}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>
                            {run.product} - {run.id}
                          </span>
                          <Badge variant="outline">
                            {formatDuration(run.downtime)} downtime
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">
                            Downtime Reasons:
                          </Label>
                          <div className="flex flex-wrap gap-2">
                            {run.downtimeReasons.map((reason, index) => (
                              <Badge key={index} variant="outline">
                                {reason}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Downtime Recording Dialog */}
      <Dialog open={showDowntimeDialog} onOpenChange={setShowDowntimeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Downtime</DialogTitle>
            <DialogDescription>
              Record downtime for {selectedRun?.product} - {selectedRun?.id}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="downtime-reason">Downtime Reason</Label>
              <Textarea
                id="downtime-reason"
                placeholder="Describe the reason for downtime..."
                value={downtimeReason}
                onChange={(e) => setDowntimeReason(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="downtime-duration">Duration (minutes)</Label>
              <Input
                id="downtime-duration"
                type="number"
                placeholder="Enter duration in minutes"
                value={downtimeDuration}
                onChange={(e) => setDowntimeDuration(Number(e.target.value))}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDowntimeDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmitDowntime}>Record Downtime</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
