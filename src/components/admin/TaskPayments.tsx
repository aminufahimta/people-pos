import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Check, X, DollarSign, Clock, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

interface CompletedTask {
  id: string;
  title: string;
  customer_name: string | null;
  completed_at: string | null;
  is_paid: boolean;
  paid_at: string | null;
  assigned_to: string | null;
  project_id: string | null;
  assignee?: {
    full_name: string;
  };
  project?: {
    customer_name: string;
  };
}

export function TaskPayments() {
  const [activeTab, setActiveTab] = useState("unpaid");
  const queryClient = useQueryClient();

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["completed-tasks-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          id,
          title,
          customer_name,
          completed_at,
          is_paid,
          paid_at,
          assigned_to,
          project_id,
          assignee:profiles!tasks_assigned_to_fkey(full_name),
          project:projects!tasks_project_id_fkey(customer_name)
        `)
        .eq("status", "completed")
        .eq("is_deleted", false)
        .order("completed_at", { ascending: false });

      if (error) throw error;
      return data as CompletedTask[];
    },
  });

  const markAsPaidMutation = useMutation({
    mutationFn: async ({ taskId, isPaid }: { taskId: string; isPaid: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("tasks")
        .update({
          is_paid: isPaid,
          paid_at: isPaid ? new Date().toISOString() : null,
          paid_by: isPaid ? user?.id : null,
        })
        .eq("id", taskId);

      if (error) throw error;
    },
    onSuccess: (_, { isPaid }) => {
      queryClient.invalidateQueries({ queryKey: ["completed-tasks-payments"] });
      toast.success(isPaid ? "Task marked as paid" : "Task marked as unpaid");
    },
    onError: () => {
      toast.error("Failed to update payment status");
    },
  });

  const unpaidTasks = tasks?.filter((t) => !t.is_paid) || [];
  const paidTasks = tasks?.filter((t) => t.is_paid) || [];

  const TaskTable = ({ taskList, showPayButton }: { taskList: CompletedTask[]; showPayButton: boolean }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Task</TableHead>
          <TableHead>Technician</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Completed</TableHead>
          {!showPayButton && <TableHead>Paid On</TableHead>}
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {taskList.length === 0 ? (
          <TableRow>
            <TableCell colSpan={showPayButton ? 5 : 6} className="text-center text-muted-foreground py-8">
              No tasks found
            </TableCell>
          </TableRow>
        ) : (
          taskList.map((task) => (
            <TableRow key={task.id}>
              <TableCell className="font-medium">{task.title}</TableCell>
              <TableCell>{task.assignee?.full_name || "Unassigned"}</TableCell>
              <TableCell>{task.project?.customer_name || task.customer_name || "N/A"}</TableCell>
              <TableCell>
                {task.completed_at ? format(new Date(task.completed_at), "MMM d, yyyy") : "N/A"}
              </TableCell>
              {!showPayButton && (
                <TableCell>
                  {task.paid_at ? format(new Date(task.paid_at), "MMM d, yyyy") : "N/A"}
                </TableCell>
              )}
              <TableCell className="text-right">
                {showPayButton ? (
                  <Button
                    size="sm"
                    onClick={() => markAsPaidMutation.mutate({ taskId: task.id, isPaid: true })}
                    disabled={markAsPaidMutation.isPending}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Mark Paid
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => markAsPaidMutation.mutate({ taskId: task.id, isPaid: false })}
                    disabled={markAsPaidMutation.isPending}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Mark Unpaid
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tasks?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payment</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{unpaidTasks.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{paidTasks.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Task Payments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="unpaid" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Unpaid
                {unpaidTasks.length > 0 && (
                  <Badge variant="destructive" className="ml-1">
                    {unpaidTasks.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="paid" className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Paid
              </TabsTrigger>
            </TabsList>
            <TabsContent value="unpaid">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : (
                <TaskTable taskList={unpaidTasks} showPayButton={true} />
              )}
            </TabsContent>
            <TabsContent value="paid">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : (
                <TaskTable taskList={paidTasks} showPayButton={false} />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
