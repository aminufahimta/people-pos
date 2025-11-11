import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, RotateCcw, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  customer_name: string | null;
  deleted_at: string;
  deleted_by: string;
  created_at: string;
}

interface TaskBinProps {
  userId: string;
  isSuperAdmin?: boolean;
}

export const TaskBin = ({ userId, isSuperAdmin = false }: TaskBinProps) => {
  const queryClient = useQueryClient();

  const { data: deletedTasks, isLoading } = useQuery({
    queryKey: ["deleted-tasks", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("is_deleted", true)
        .order("deleted_at", { ascending: false });

      if (error) throw error;
      return data as Task[];
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from("tasks")
        .update({
          is_deleted: false,
          deleted_at: null,
          deleted_by: null,
        })
        .eq("id", taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deleted-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task restored successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to restore task: ${error.message}`);
    },
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deleted-tasks"] });
      toast.success("Task permanently deleted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete task: ${error.message}`);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Task Bin</CardTitle>
        <CardDescription>
          {isSuperAdmin
            ? "View and manage all deleted tasks. Only Super Admins can permanently delete tasks."
            : "View your deleted tasks. Contact a Super Admin to permanently remove tasks."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!deletedTasks || deletedTasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Trash2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No deleted tasks</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Deleted At</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deletedTasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">{task.title}</TableCell>
                  <TableCell>{task.customer_name || "N/A"}</TableCell>
                  <TableCell>
                    <Badge variant={getPriorityColor(task.priority)}>
                      {task.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(task.deleted_at), "MMM dd, yyyy HH:mm")}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {isSuperAdmin && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => restoreMutation.mutate(task.id)}
                            disabled={restoreMutation.isPending}
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Restore
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => permanentDeleteMutation.mutate(task.id)}
                            disabled={permanentDeleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete Forever
                          </Button>
                        </>
                      )}
                      {!isSuperAdmin && (
                        <Badge variant="secondary">Admin Action Required</Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
