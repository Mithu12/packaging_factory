import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, ArrowRight } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const recentOrders = [
  {
    id: "ORD-7253",
    customer: {
      name: "Liam Johnson",
      email: "liam@example.com",
      avatar: "/avatars/01.png",
      initials: "LJ",
    },
    amount: "৳250.00",
    status: "Completed",
    date: "June 25, 2024",
    items: 3,
  },
  {
    id: "ORD-7252",
    customer: {
      name: "Olivia Smith",
      email: "olivia@example.com",
      avatar: "/avatars/02.png",
      initials: "OS",
    },
    amount: "৳150.00",
    status: "Processing",
    date: "June 26, 2024",
    items: 1,
  },
  {
    id: "ORD-7251",
    customer: {
      name: "Noah Williams",
      email: "noah@example.com",
      avatar: "/avatars/03.png",
      initials: "NW",
    },
    amount: "৳350.00",
    status: "Shipped",
    date: "June 27, 2024",
    items: 5,
  },
  {
    id: "ORD-7250",
    customer: {
      name: "Emma Brown",
      email: "emma@example.com",
      avatar: "/avatars/04.png",
      initials: "EB",
    },
    amount: "৳450.00",
    status: "Completed",
    date: "June 28, 2024",
    items: 2,
  },
  {
    id: "ORD-7249",
    customer: {
      name: "James Jones",
      email: "james@example.com",
      avatar: "/avatars/05.png",
      initials: "JJ",
    },
    amount: "৳550.00",
    status: "Pending",
    date: "June 29, 2024",
    items: 4,
  },
];

export function RecentOrdersTable() {
  return (
    <Card className="col-span-4 md:col-span-7 border shadow-sm bg-white">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Recent Orders</CardTitle>
          <CardDescription>You have 265 orders this month.</CardDescription>
        </div>
        <Button variant="outline" size="sm" className="gap-1">
          View All <ArrowRight className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[100px]">Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Date</TableHead>
              <TableHead className="hidden md:table-cell text-right">
                Items
              </TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentOrders.map((order) => (
              <TableRow key={order.id} className="hover:bg-muted/50">
                <TableCell className="font-medium">{order.id}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={order.customer.avatar}
                        alt={order.customer.name}
                      />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {order.customer.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium leading-none">
                        {order.customer.name}
                      </span>
                      <span className="text-xs text-muted-foreground mt-0.5">
                        {order.customer.email}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={`
                      ${order.status === "Completed" ? "bg-green-100 text-green-700 hover:bg-green-100/80 dark:bg-green-900/30 dark:text-green-400" : ""}
                      ${order.status === "Processing" ? "bg-blue-100 text-blue-700 hover:bg-blue-100/80 dark:bg-blue-900/30 dark:text-blue-400" : ""}
                      ${order.status === "Shipped" ? "bg-purple-100 text-purple-700 hover:bg-purple-100/80 dark:bg-purple-900/30 dark:text-purple-400" : ""}
                      ${order.status === "Pending" ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-100/80 dark:bg-yellow-900/30 dark:text-yellow-400" : ""}
                    `}
                  >
                    {order.status}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                  {order.date}
                </TableCell>
                <TableCell className="hidden md:table-cell text-right text-muted-foreground text-sm">
                  {order.items}
                </TableCell>
                <TableCell className="font-bold text-right">
                  {order.amount}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem>Copy payment ID</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>View customer</DropdownMenuItem>
                      <DropdownMenuItem>View order details</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
