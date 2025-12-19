import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle, XCircle, Clock, Building2, User, Calendar, MapPin, Phone } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  installation_address: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  created_at: string;
  updated_at: string;
  assigned_to: string | null;
  project_id: string | null;
  assignee?: {
    full_name: string;
  };
  project?: {
    customer_name: string;
    project_status: string;
  };
}

interface TaskReviewProps {
  userId: string;
  userRole?: string;
}

export const TaskReview = ({ userId, userRole }: TaskReviewProps) => {
  const queryClient = useQueryClient();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks-under-review"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          *,
          assignee:profiles!tasks_assigned_to_fkey(full_name),
          project:projects(customer_name, project_status)
        `)
        .eq("status", "under_review")
        .eq("is_deleted", false)
        .order("updated_at", { ascending: false });
      
      if (error) throw error;
      return data as Task[];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from("tasks")
        .update({ 
          status: "completed",
          completed_at: new Date().toISOString()
        })
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks-under-review"] });
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task approved and marked as completed");
      setSelectedTask(null);
    },
    onError: (error) => {
      toast.error(`Failed to approve task: ${error.message}`);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ taskId, reason }: { taskId: string; reason: string }) => {
      // First add a message with the rejection reason
      if (reason.trim()) {
        await supabase.from("task_messages").insert({
          task_id: taskId,
          sender_id: userId,
          message: `Task rejected: ${reason}`,
        });
      }
      
      // Then update the status back to in_progress
      const { error } = await supabase
        .from("tasks")
        .update({ status: "in_progress" })
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks-under-review"] });
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task rejected and sent back to technician");
      setSelectedTask(null);
      setRejectDialogOpen(false);
      setRejectionReason("");
    },
    onError: (error) => {
      toast.error(`Failed to reject task: ${error.message}`);
    },
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "low": return "bg-muted text-muted-foreground";
      case "medium": return "bg-blue-500/20 text-blue-600";
      case "high": return "bg-orange-500/20 text-orange-600";
      case "urgent": return "bg-destructive/20 text-destructive";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const handleReject = () => {
    if (selectedTask) {
      rejectMutation.mutate({ 
        taskId: selectedTask.id, 
        reason: rejectionReason 
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            <CardTitle className="text-xl">Tasks Pending Review</CardTitle>
            <Badge variant="secondary" className="ml-2">
              {tasks.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading tasks...</div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-success opacity-50" />
              <p>No tasks pending review</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map((task) => (
                <Card key={task.id} className="hover:shadow-md transition-shadow border-orange-200 dark:border-orange-900/30">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-lg">{task.title}</h3>
                          <Badge className={getPriorityColor(task.priority)}>
                            {task.priority}
                          </Badge>
                        </div>
                        
                        {task.description && (
                          <p className="text-sm text-muted-foreground">{task.description}</p>
                        )}
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <User className="h-4 w-4" />
                            <span>Technician: {task.assignee?.full_name || "Unassigned"}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Building2 className="h-4 w-4" />
                            <span>{task.project?.customer_name || task.customer_name || "No customer"}</span>
                          </div>
                          {task.customer_phone && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Phone className="h-4 w-4" />
                              <span>{task.customer_phone}</span>
                            </div>
                          )}
                          {task.installation_address && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <MapPin className="h-4 w-4" />
                              <span className="truncate">{task.installation_address}</span>
                            </div>
                          )}
                          {task.due_date && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              <span>Due: {format(new Date(task.due_date), "MMM dd, yyyy")}</span>
                            </div>
                          )}
                        </div>
                        
                        <p className="text-xs text-muted-foreground">
                          Submitted for review: {format(new Date(task.updated_at), "MMM dd, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                      
                      <div className="flex flex-row lg:flex-col gap-2">
                        <Button
                          onClick={() => approveMutation.mutate(task.id)}
                          disabled={approveMutation.isPending}
                          className="flex-1 lg:flex-none bg-success hover:bg-success/90 text-success-foreground"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => {
                            setSelectedTask(task);
                            setRejectDialogOpen(true);
                          }}
                          disabled={rejectMutation.isPending}
                          className="flex-1 lg:flex-none"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Task</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this task. The technician will be notified and the task will be sent back to "In Progress".
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Enter rejection reason (optional but recommended)..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setRejectionReason("");
                setSelectedTask(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? "Rejecting..." : "Reject Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
