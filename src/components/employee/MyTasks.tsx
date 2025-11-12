import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ClipboardList, MessageSquare, Calendar, MapPin, Phone, Building2, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { MyTasksDetail } from "./MyTasksDetail";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
  project?: {
    customer_name: string;
    project_status: string;
    customer_phone?: string | null;
    customer_address?: string | null;
  };
}

export const MyTasks = ({ userId }: { userId: string }) => {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const toggleTaskExpanded = (taskId: string) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["my-tasks", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          *,
          project:projects(customer_name, project_status, customer_phone, customer_address)
        `)
        .eq("assigned_to", userId)
        .neq("status", "completed")
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Task[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      // When technician marks as completed, set to under_review instead
      const actualStatus = status === "completed" ? "under_review" : status;
      const updateData: any = { status: actualStatus };
      
      const { error } = await supabase
        .from("tasks")
        .update(updateData)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-tasks", userId] });
      toast.success("Task status updated");
    },
    onError: (error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-500";
      case "in_progress": return "bg-blue-500";
      case "under_review": return "bg-orange-500";
      case "completed": return "bg-green-500";
      case "cancelled": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "low": return "bg-gray-500";
      case "medium": return "bg-blue-500";
      case "high": return "bg-orange-500";
      case "urgent": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === "pending").length,
    inProgress: tasks.filter(t => t.status === "in_progress").length,
    underReview: tasks.filter(t => t.status === "under_review").length,
    completed: tasks.filter(t => t.status === "completed").length,
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            <CardTitle className="text-xl sm:text-2xl">My Assigned Tasks</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <Card className="bg-muted/50">
              <CardContent className="pt-4 sm:pt-6 pb-4">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Total</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground">{stats.total}</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/50">
              <CardContent className="pt-4 sm:pt-6 pb-4">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Pending</p>
                <p className="text-xl sm:text-2xl font-bold text-amber-600">{stats.pending}</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/50">
              <CardContent className="pt-4 sm:pt-6 pb-4">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">In Progress</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-600">{stats.inProgress}</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/50">
              <CardContent className="pt-4 sm:pt-6 pb-4">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Under Review</p>
                <p className="text-xl sm:text-2xl font-bold text-orange-600">{stats.underReview}</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/50">
              <CardContent className="pt-4 sm:pt-6 pb-4">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Completed</p>
                <p className="text-xl sm:text-2xl font-bold text-emerald-600">{stats.completed}</p>
              </CardContent>
            </Card>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading tasks...</div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No tasks assigned yet</div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {tasks.map((task) => {
                const isExpanded = expandedTasks.has(task.id);
                return (
                  <Collapsible key={task.id} open={isExpanded} onOpenChange={() => toggleTaskExpanded(task.id)}>
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex flex-col space-y-3">
                          {/* Header Row with Expand Toggle */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-base sm:text-lg">{task.title}</h3>
                                <CollapsibleTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                  </Button>
                                </CollapsibleTrigger>
                              </div>
                              {/* Customer Name - Always Visible */}
                              <div className="flex items-center gap-2 text-muted-foreground mt-1">
                                <Building2 className="h-4 w-4 shrink-0" />
                                <span className="text-xs sm:text-sm truncate">
                                  {task.project?.customer_name || task.customer_name || "No customer assigned"}
                                </span>
                              </div>
                            </div>
                            <Badge className={`${getPriorityColor(task.priority)} shrink-0 text-xs`}>
                              {task.priority}
                            </Badge>
                          </div>

                          {/* Collapsible Content */}
                          <CollapsibleContent className="space-y-3">
                            {task.description && (
                              <p className="text-xs sm:text-sm text-muted-foreground">
                                {task.description}
                              </p>
                            )}

                            {/* Info Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Building2 className="h-4 w-4 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  {task.project ? (
                                    <>
                                      <span className="truncate block">{task.project.customer_name}</span>
                                      <Badge variant="outline" className="mt-1 text-xs">
                                        {task.project.project_status}
                                      </Badge>
                                    </>
                                  ) : task.customer_name ? (
                                    <>
                                      <span className="truncate block">{task.customer_name}</span>
                                    </>
                                  ) : (
                                    <span>N/A</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Phone className="h-4 w-4 shrink-0" />
                                <span className="truncate">{task.customer_phone || task.project?.customer_phone || "N/A"}</span>
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <MapPin className="h-4 w-4 shrink-0" />
                                <span className="truncate">{task.installation_address || task.project?.customer_address || "N/A"}</span>
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Calendar className="h-4 w-4 shrink-0" />
                                <span>
                                  {task.due_date ? format(new Date(task.due_date), "MMM dd, yyyy") : "No deadline"}
                                </span>
                              </div>
                            </div>

                            {/* Actions Row */}
                            <div className="flex items-center gap-2 pt-2 border-t">
                              <Select
                                value={task.status}
                                onValueChange={(value) => updateStatusMutation.mutate({ id: task.id, status: value })}
                              >
                                <SelectTrigger className="flex-1 h-9 text-xs sm:text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="in_progress">In Progress</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                variant="outline"
                                size="sm"
                                className="shrink-0 h-9"
                                onClick={() => setSelectedTaskId(prev => prev === task.id ? null : task.id)}
                              >
                                <MessageSquare className="h-4 w-4 sm:mr-2" />
                                <span className="hidden sm:inline">Chat</span>
                              </Button>
                            </div>
                          </CollapsibleContent>
                        </div>
                      </CardContent>
                    </Card>
                  </Collapsible>
                );
              })}
            </div>
          )}
          
          {selectedTaskId && (
            <MyTasksDetail
              taskId={selectedTaskId}
              currentUserId={userId}
              onClose={() => setSelectedTaskId(null)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};
