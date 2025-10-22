import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bell,
  CheckCircle,
  AlertCircle,
  Info,
  X,
  Eye,
  Calendar,
  Filter,
} from "lucide-react";
import { salesRepApi } from "../services/salesrep-api";
import type { SalesRepNotification } from "../types";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const SalesRepNotifications = () => {
  const [typeFilter, setTypeFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedNotification, setSelectedNotification] = useState<SalesRepNotification | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const limit = 10;

  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ["salesrep-notifications", typeFilter, currentPage],
    queryFn: () =>
      salesRepApi.getNotifications(
        false,
        { page: currentPage, limit }
      ),
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: number) => salesRepApi.markNotificationAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salesrep-notifications"] });
      toast({
        title: "Success",
        description: "Notification marked as read",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark notification as read",
        variant: "destructive",
      });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => salesRepApi.markAllNotificationsAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salesrep-notifications"] });
      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark all notifications as read",
        variant: "destructive",
      });
    },
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      info: "default",
      warning: "secondary",
      error: "destructive",
      success: "outline",
    };

    return (
      <Badge variant={variants[type] || "default"}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    );
  };

  const handleMarkAsRead = (id: number) => {
    markAsReadMutation.mutate(id);
  };

  const handleMarkAllAsRead = () => {
    markAllReadMutation.mutate();
  };

  const unreadCount = notificationsData?.data?.filter(n => !n.is_read).length || 0;
  const notifications = notificationsData?.data || [];
  const pagination = notificationsData?.pagination;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">
            View and manage your notifications and alerts
          </p>
        </div>
        {unreadCount > 0 && (
          <Button onClick={handleMarkAllAsRead} variant="outline">
            <CheckCircle className="h-4 w-4 mr-2" />
            Mark All Read ({unreadCount})
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="success">Success</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => {
                setTypeFilter("");
                setCurrentPage(1);
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notifications Table */}
      <Card>
        <CardHeader>
          <CardTitle>Notification List</CardTitle>
          <CardDescription>
            {pagination ? `${pagination.total} notifications found` : "Loading notifications..."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Notification</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
                        <div className="h-3 w-64 bg-gray-200 rounded animate-pulse" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="h-5 w-16 bg-gray-200 rounded animate-pulse" />
                    </TableCell>
                    <TableCell>
                      <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
                    </TableCell>
                    <TableCell>
                      <div className="h-5 w-16 bg-gray-200 rounded animate-pulse" />
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-1">
                        <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                        <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : notifications.length > 0 ? (
                notifications.map((notification) => (
                  <TableRow key={notification.id} className={!notification.is_read ? "bg-blue-50" : ""}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          {getNotificationIcon(notification.type)}
                          <p className="font-medium">{notification.title}</p>
                          {!notification.is_read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground max-w-[300px] truncate">
                          {notification.message}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getTypeBadge(notification.type)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm">
                        <Calendar className="h-3 w-3 mr-1" />
                        {format(new Date(notification.created_at), 'MMM dd, yyyy HH:mm')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={notification.is_read ? "outline" : "default"}>
                        {notification.is_read ? "Read" : "Unread"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedNotification(notification)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {!notification.is_read && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMarkAsRead(notification.id)}
                            disabled={markAsReadMutation.isPending}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex flex-col items-center space-y-2">
                      <Bell className="h-12 w-12 text-muted-foreground" />
                      <p className="text-muted-foreground">No notifications found</p>
                      <p className="text-sm text-muted-foreground">
                        You're all caught up!
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Notification Detail Dialog */}
      {selectedNotification && (
        <Dialog open={!!selectedNotification} onOpenChange={() => setSelectedNotification(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                {getNotificationIcon(selectedNotification.type)}
                <span>{selectedNotification.title}</span>
              </DialogTitle>
              <DialogDescription>
                {format(new Date(selectedNotification.created_at), 'MMMM dd, yyyy \'at\' HH:mm')}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm leading-relaxed">
                {selectedNotification.message}
              </p>
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center space-x-2">
                  {getTypeBadge(selectedNotification.type)}
                  <Badge variant={selectedNotification.is_read ? "outline" : "default"}>
                    {selectedNotification.is_read ? "Read" : "Unread"}
                  </Badge>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedNotification(null)}>
                Close
              </Button>
              {!selectedNotification.is_read && (
                <Button
                  onClick={() => {
                    handleMarkAsRead(selectedNotification.id);
                    setSelectedNotification(null);
                  }}
                  disabled={markAsReadMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark as Read
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default SalesRepNotifications;
