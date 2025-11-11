import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, Eye } from "lucide-react";
import { format } from "date-fns";
import { TaskDetailsDialog } from "./TaskDetailsDialog";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  customer_name: string | null;
  customer_phone: string | null;
  completed_at: string | null;
  created_at: string;
  created_by: string;
  assigned_to: string | null;
  due_date: string | null;
  installation_address: string | null;
  assigned_profile?: {
    full_name: string;
    email: string;
  };
}

interface CompletedTasksProps {
  userId: string;
  userRole?: string;
}

export const CompletedTasks = ({ userId, userRole }: CompletedTasksProps) => {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const { data: completedTasks, isLoading } = useQuery({
    queryKey: ["completed-tasks", userId, userRole],
    queryFn: async () => {
      let query = supabase
        .from("tasks")
        .select(`
          *,
          assigned_profile:profiles!tasks_assigned_to_fkey(full_name, email)
        `)
        .eq("status", "completed")
        .eq("is_deleted", false)
        .order("completed_at", { ascending: false });

      // If user is an employee, only show their assigned tasks
      if (userRole === "employee") {
        query = query.eq("assigned_to", userId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Task[];
    },
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "outline";
    }
  };

  const handleViewDetails = (task: Task) => {
    setSelectedTask(task);
    setIsDetailsOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <div>
              <CardTitle>Completed Tasks</CardTitle>
              <CardDescription>
                View all completed tasks and their details
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!completedTasks || completedTasks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle2 className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No completed tasks yet</p>
              <p className="text-sm mt-2">Completed tasks will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Total: <span className="font-semibold text-foreground">{completedTasks.length}</span> completed tasks
                </p>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Completed Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedTasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{task.title}</p>
                          {task.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {task.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {task.assigned_profile?.full_name || "Unassigned"}
                      </TableCell>
                      <TableCell>
                        {task.customer_name ? (
                          <div>
                            <p className="text-sm">{task.customer_name}</p>
                            {task.customer_phone && (
                              <p className="text-xs text-muted-foreground">
                                {task.customer_phone}
                              </p>
                            )}
                          </div>
                        ) : (
                          "N/A"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getPriorityColor(task.priority)}>
                          {task.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {task.completed_at
                          ? format(new Date(task.completed_at), "MMM dd, yyyy HH:mm")
                          : "N/A"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewDetails(task)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <TaskDetailsDialog
        task={selectedTask}
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedTask(null);
        }}
        currentUserId={userId}
      />
    </>
  );
};
