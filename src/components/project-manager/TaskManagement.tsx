import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, ClipboardList, Pencil, MessageSquare, Trash2 } from "lucide-react";
import { TaskDetailsDialog } from "./TaskDetailsDialog";
import { format } from "date-fns";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigned_to: string | null;
  created_by: string;
  due_date: string | null;
  installation_address: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  project_id: string | null;
  created_at: string;
  assigned_profile?: {
    full_name: string;
    email: string;
  };
  project?: {
    customer_name: string;
    customer_phone: string | null;
  };
}

interface Profile {
  id: string;
  full_name: string;
  email: string;
}

interface Project {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  customer_address: string | null;
}

export const TaskManagement = ({ userId }: { userId: string }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "pending",
    priority: "medium",
    assigned_to: "",
    due_date: "",
    installation_address: "",
    project_id: "",
    routers_used: 0,
    poe_adapters_used: 0,
    poles_used: 0,
    anchors_used: 0,
  });
  
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          *,
          assigned_profile:profiles!tasks_assigned_to_fkey(full_name, email),
          project:projects(customer_name, customer_phone)
        `)
        .eq("is_deleted", false)
        .neq("status", "completed")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("is_approved", true)
        .order("full_name");
      
      if (error) throw error;
      return data as Profile[];
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, customer_name, customer_phone, customer_email, customer_address")
        .eq("project_status", "active")
        .order("customer_name");
      
      if (error) throw error;
      return data as Project[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("tasks").insert([{
        ...data,
        created_by: userId,
        assigned_to: data.assigned_to || null,
        due_date: data.due_date || null,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task created successfully");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed to create task: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("tasks")
        .update({
          ...data,
          assigned_to: data.assigned_to || null,
          due_date: data.due_date || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task updated successfully");
      setIsDialogOpen(false);
      resetForm();
      setEditingTask(null);
    },
    onError: (error) => {
      toast.error(`Failed to update task: ${error.message}`);
    },
  });

  const softDeleteMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from("tasks")
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: userId,
        })
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task moved to bin");
    },
    onError: (error: Error) => {
      toast.error(`Failed to move task to bin: ${error.message}`);
    },
  });

  const hardDeleteMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete task: ${error.message}`);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updateData: any = { status };
      if (status === "completed") {
        updateData.completed_at = new Date().toISOString();
      }
      const { error } = await supabase
        .from("tasks")
        .update(updateData)
        .eq("id", id);
      if (error) throw error;

      // Deduct inventory if task is completed
      if (status === "completed") {
        const { error: deductError } = await supabase.functions.invoke('deduct-task-inventory', {
          body: { taskId: id },
        });
        if (deductError) {
          console.error('Failed to deduct inventory:', deductError);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task status updated");
    },
    onError: (error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      status: "pending",
      priority: "medium",
      assigned_to: "",
      due_date: "",
      installation_address: "",
      project_id: "",
      routers_used: 0,
      poe_adapters_used: 0,
      poles_used: 0,
      anchors_used: 0,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTask) {
      updateMutation.mutate({ id: editingTask.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || "",
      status: task.status,
      priority: task.priority,
      assigned_to: task.assigned_to || "",
      due_date: task.due_date ? new Date(task.due_date).toISOString().slice(0, 16) : "",
      installation_address: task.installation_address || "",
      project_id: task.project_id || "",
      routers_used: 0,
      poe_adapters_used: 0,
      poles_used: 0,
      anchors_used: 0,
    });
    setIsDialogOpen(true);
  };

  const handleViewDetails = (task: Task) => {
    setSelectedTask(task);
    setIsDetailsOpen(true);
  };

  const canHardDelete = (task: Task) => {
    const createdAt = new Date(task.created_at);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return createdAt > oneHourAgo;
  };

  const handleDeleteTask = (task: Task) => {
    if (canHardDelete(task)) {
      if (window.confirm("Are you sure you want to permanently delete this task? This action cannot be undone.")) {
        hardDeleteMutation.mutate(task.id);
      }
    } else {
      if (window.confirm("This task will be moved to the bin. Contact a Super Admin to permanently delete it.")) {
        softDeleteMutation.mutate(task.id);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-500";
      case "in_progress": return "bg-blue-500";
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
    completed: tasks.filter(t => t.status === "completed").length,
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          <CardTitle>Task Management</CardTitle>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            resetForm();
            setEditingTask(null);
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTask ? "Edit Task" : "Create New Task"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Task Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="assigned_to">Assign To</Label>
                  <Select value={formData.assigned_to} onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  id="due_date"
                  type="datetime-local"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="project_id">Customer/Project *</Label>
                <Select 
                  value={formData.project_id} 
                  onValueChange={(value) => setFormData({ ...formData, project_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.customer_name}
                        {project.customer_phone && ` - ${project.customer_phone}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {projects.length === 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    No customers available. Please create a customer first.
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="installation_address">Installation Address</Label>
                <Textarea
                  id="installation_address"
                  value={formData.installation_address}
                  onChange={(e) => setFormData({ ...formData, installation_address: e.target.value })}
                  rows={2}
                  placeholder="Specific installation location (optional)"
                />
              </div>
              
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold mb-3">Inventory Items Required</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="routers_used">Routers</Label>
                    <Input
                      id="routers_used"
                      type="number"
                      min="0"
                      value={formData.routers_used}
                      onChange={(e) => setFormData({ ...formData, routers_used: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="poe_adapters_used">POE Adapters</Label>
                    <Input
                      id="poe_adapters_used"
                      type="number"
                      min="0"
                      value={formData.poe_adapters_used}
                      onChange={(e) => setFormData({ ...formData, poe_adapters_used: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="poles_used">Poles</Label>
                    <Input
                      id="poles_used"
                      type="number"
                      min="0"
                      value={formData.poles_used}
                      onChange={(e) => setFormData({ ...formData, poles_used: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="anchors_used">Anchors</Label>
                    <Input
                      id="anchors_used"
                      type="number"
                      min="0"
                      value={formData.anchors_used}
                      onChange={(e) => setFormData({ ...formData, anchors_used: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingTask ? "Update Task" : "Create Task"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Tasks</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-yellow-500">{stats.pending}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">In Progress</p>
              <p className="text-2xl font-bold text-blue-500">{stats.inProgress}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold text-green-500">{stats.completed}</p>
            </CardContent>
          </Card>
        </div>
        {isLoading ? (
          <p>Loading tasks...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{task.title}</p>
                      {task.description && (
                        <p className="text-sm text-muted-foreground">{task.description.substring(0, 50)}...</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{task.assigned_profile?.full_name || "Unassigned"}</TableCell>
                  <TableCell>
                    <Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={task.status}
                      onValueChange={(value) => updateStatusMutation.mutate({ id: task.id, status: value })}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {task.due_date ? format(new Date(task.due_date), "MMM dd, yyyy") : "N/A"}
                  </TableCell>
                  <TableCell>
                    {task.project ? (
                      <div>
                        <p className="text-sm">{task.project.customer_name}</p>
                        {task.project.customer_phone && (
                          <p className="text-xs text-muted-foreground">{task.project.customer_phone}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No customer</p>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(task)}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTask(task)}
                        title={canHardDelete(task) ? "Delete (within 1 hour)" : "Move to bin"}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      
      <TaskDetailsDialog
        task={selectedTask}
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedTask(null);
        }}
        currentUserId={userId}
      />
    </Card>
  );
};
