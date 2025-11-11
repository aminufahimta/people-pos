import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, FolderOpen, Pencil, ChevronDown, ChevronRight, MessageSquare } from "lucide-react";
import { TaskDetailsDialog } from "@/components/project-manager/TaskDetailsDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format } from "date-fns";

interface Project {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  customer_address: string | null;
  project_status: string;
  notes: string | null;
  created_at: string;
  created_by: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigned_to: string | null;
  due_date: string | null;
  installation_address: string | null;
  created_at: string;
  assigned_profile?: {
    full_name: string;
  };
}

interface Profile {
  id: string;
  full_name: string;
  email: string;
}

export const ProjectManagement = ({ userId }: { userId: string }) => {
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [selectedProjectForTask, setSelectedProjectForTask] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [projectFormData, setProjectFormData] = useState({
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    customer_address: "",
    notes: "",
  });
  const [taskFormData, setTaskFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    assigned_to: "",
    due_date: "",
    installation_address: "",
    routers_used: 0,
    poe_adapters_used: 0,
    poles_used: 0,
    anchors_used: 0,
  });

  const [selectedTaskForChat, setSelectedTaskForChat] = useState<Task | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

const queryClient = useQueryClient();

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      // Sort: completed projects at bottom, others at top
      const sorted = (data as Project[]).sort((a, b) => {
        if (a.project_status === 'completed' && b.project_status !== 'completed') return 1;
        if (a.project_status !== 'completed' && b.project_status === 'completed') return -1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      
      return sorted;
    },
  });

  const { data: tasksByProject = {} } = useQuery({
    queryKey: ["tasks-by-project"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          *,
          assigned_profile:profiles!tasks_assigned_to_fkey(full_name)
        `)
        .eq("is_deleted", false)
        .neq("status", "completed")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      // Group tasks by project_id
      const grouped = (data as Task[]).reduce((acc, task: any) => {
        const projectId = task.project_id || "unassigned";
        if (!acc[projectId]) acc[projectId] = [];
        acc[projectId].push(task);
        return acc;
      }, {} as Record<string, Task[]>);
      
      return grouped;
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

  const createProjectMutation = useMutation({
    mutationFn: async (data: typeof projectFormData) => {
      const { error } = await supabase.from("projects").insert([{
        ...data,
        created_by: userId,
        project_status: "active",
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project created successfully");
      setIsProjectDialogOpen(false);
      resetProjectForm();
    },
    onError: (error) => {
      toast.error(`Failed to create project: ${error.message}`);
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof projectFormData }) => {
      const { error } = await supabase
        .from("projects")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project updated successfully");
      setIsProjectDialogOpen(false);
      resetProjectForm();
      setEditingProject(null);
    },
    onError: (error) => {
      toast.error(`Failed to update project: ${error.message}`);
    },
  });

  const updateProjectStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("projects")
        .update({ project_status: status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project status updated");
    },
    onError: (error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: typeof taskFormData & { project_id: string }) => {
      const { error } = await supabase.from("tasks").insert([{
        ...data,
        created_by: userId,
        assigned_to: data.assigned_to || null,
        due_date: data.due_date || null,
        status: "pending",
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks-by-project"] });
      toast.success("Task created successfully");
      setIsTaskDialogOpen(false);
      resetTaskForm();
      setSelectedProjectForTask(null);
    },
    onError: (error) => {
      toast.error(`Failed to create task: ${error.message}`);
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof taskFormData> }) => {
      const updateData: any = {
        title: data.title,
        description: data.description,
        priority: data.priority,
        assigned_to: data.assigned_to || null,
        due_date: data.due_date || null,
        routers_used: data.routers_used ?? 0,
        poe_adapters_used: data.poe_adapters_used ?? 0,
        poles_used: data.poles_used ?? 0,
        anchors_used: data.anchors_used ?? 0,
      };
      const { error } = await supabase
        .from("tasks")
        .update(updateData)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks-by-project"] });
      toast.success("Task updated successfully");
      setIsTaskDialogOpen(false);
      resetTaskForm();
      setSelectedProjectForTask(null);
      setEditingTask(null);
    },
    onError: (error) => {
      toast.error(`Failed to update task: ${error.message}`);
    },
  });

  const updateTaskStatusMutation = useMutation({
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
      queryClient.invalidateQueries({ queryKey: ["tasks-by-project"] });
      toast.success("Task status updated");
    },
    onError: (error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });

  const resetProjectForm = () => {
    setProjectFormData({
      customer_name: "",
      customer_phone: "",
      customer_email: "",
      customer_address: "",
      notes: "",
    });
  };

  const resetTaskForm = () => {
    setTaskFormData({
      title: "",
      description: "",
      priority: "medium",
      assigned_to: "",
      due_date: "",
      installation_address: "",
      routers_used: 0,
      poe_adapters_used: 0,
      poles_used: 0,
      anchors_used: 0,
    });
  };

  const handleProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProject) {
      updateProjectMutation.mutate({ id: editingProject.id, data: projectFormData });
    } else {
      createProjectMutation.mutate(projectFormData);
    }
  };

  const handleTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTask) {
      updateTaskMutation.mutate({ id: editingTask.id, data: taskFormData });
      return;
    }
    if (selectedProjectForTask) {
      createTaskMutation.mutate({ ...taskFormData, project_id: selectedProjectForTask });
    }
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setProjectFormData({
      customer_name: project.customer_name,
      customer_phone: project.customer_phone || "",
      customer_email: project.customer_email || "",
      customer_address: project.customer_address || "",
      notes: project.notes || "",
    });
    setIsProjectDialogOpen(true);
  };

  const handleAddTask = (projectId: string) => {
    setEditingTask(null);
    setSelectedProjectForTask(projectId);
    setIsTaskDialogOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setTaskFormData({
      title: task.title,
      description: task.description || "",
      priority: task.priority,
      assigned_to: task.assigned_to || "",
      due_date: task.due_date ? task.due_date.slice(0,16) : "",
      installation_address: "",
      routers_used: (task as any).routers_used ?? 0,
      poe_adapters_used: (task as any).poe_adapters_used ?? 0,
      poles_used: (task as any).poles_used ?? 0,
      anchors_used: (task as any).anchors_used ?? 0,
    });
    setIsTaskDialogOpen(true);
  };

  const toggleProject = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
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

  const getProjectStats = (projectId: string) => {
    const tasks = tasksByProject[projectId] || [];
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === "pending").length,
      inProgress: tasks.filter(t => t.status === "in_progress").length,
      completed: tasks.filter(t => t.status === "completed").length,
    };
  };

  const allTasks = Object.values(tasksByProject).flat();
  const overallStats = {
    total: allTasks.length,
    pending: allTasks.filter(t => t.status === "pending").length,
    inProgress: allTasks.filter(t => t.status === "in_progress").length,
    completed: allTasks.filter(t => t.status === "completed").length,
  };

  const projectStats = {
    total: projects.length,
    active: projects.filter(p => p.project_status === "active").length,
    completed: projects.filter(p => p.project_status === "completed").length,
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            <CardTitle>Project Management</CardTitle>
          </div>
          <Dialog open={isProjectDialogOpen} onOpenChange={(open) => {
            setIsProjectDialogOpen(open);
            if (!open) {
              resetProjectForm();
              setEditingProject(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Create Project
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingProject ? "Edit Project" : "Create New Project"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleProjectSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="customer_name">Customer Name *</Label>
                  <Input
                    id="customer_name"
                    value={projectFormData.customer_name}
                    onChange={(e) => setProjectFormData({ ...projectFormData, customer_name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customer_phone">Customer Phone</Label>
                    <Input
                      id="customer_phone"
                      value={projectFormData.customer_phone}
                      onChange={(e) => setProjectFormData({ ...projectFormData, customer_phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="customer_email">Customer Email</Label>
                    <Input
                      id="customer_email"
                      type="email"
                      value={projectFormData.customer_email}
                      onChange={(e) => setProjectFormData({ ...projectFormData, customer_email: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="customer_address">Customer Address</Label>
                  <Textarea
                    id="customer_address"
                    value={projectFormData.customer_address}
                    onChange={(e) => setProjectFormData({ ...projectFormData, customer_address: e.target.value })}
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={projectFormData.notes}
                    onChange={(e) => setProjectFormData({ ...projectFormData, notes: e.target.value })}
                    rows={3}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={createProjectMutation.isPending || updateProjectMutation.isPending}>
                  {editingProject ? "Update Project" : "Create Project"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {projectsLoading ? (
            <p>Loading projects...</p>
          ) : projects.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No projects yet. Create one to get started!</p>
          ) : (
            <div className="space-y-4">
              {/* Project Stats */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">Project Overview</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4 sm:pt-6 pb-4">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1">Total Projects</p>
                      <p className="text-xl sm:text-2xl font-bold text-foreground">{projectStats.total}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4 sm:pt-6 pb-4">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1">Active</p>
                      <p className="text-xl sm:text-2xl font-bold text-blue-600">{projectStats.active}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4 sm:pt-6 pb-4">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1">Completed</p>
                      <p className="text-xl sm:text-2xl font-bold text-emerald-600">{projectStats.completed}</p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Task Stats */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">Task Overview</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4 sm:pt-6 pb-4">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1">Total Tasks</p>
                      <p className="text-xl sm:text-2xl font-bold text-foreground">{overallStats.total}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4 sm:pt-6 pb-4">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1">Pending</p>
                      <p className="text-xl sm:text-2xl font-bold text-amber-600">{overallStats.pending}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4 sm:pt-6 pb-4">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1">In Progress</p>
                      <p className="text-xl sm:text-2xl font-bold text-blue-600">{overallStats.inProgress}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4 sm:pt-6 pb-4">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1">Completed</p>
                      <p className="text-xl sm:text-2xl font-bold text-emerald-600">{overallStats.completed}</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
              {projects.map((project) => {
                const stats = getProjectStats(project.id);
                const isExpanded = expandedProjects.has(project.id);
                
                return (
                  <Collapsible key={project.id} open={isExpanded} onOpenChange={() => toggleProject(project.id)}>
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                          <div className="flex-1 w-full">
                            <div className="flex items-center gap-2">
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                </Button>
                              </CollapsibleTrigger>
                              <div className="flex-1">
                                <h3 className="font-semibold text-base sm:text-lg">{project.customer_name}</h3>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                  <Select
                                    value={project.project_status}
                                    onValueChange={(value) => updateProjectStatusMutation.mutate({ id: project.id, status: value })}
                                  >
                                    <SelectTrigger className="w-28 sm:w-32 h-7 text-xs sm:text-sm">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="active">Active</SelectItem>
                                      <SelectItem value="on_hold">On Hold</SelectItem>
                                      <SelectItem value="completed">Completed</SelectItem>
                                      <SelectItem value="cancelled">Cancelled</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <span className="text-xs sm:text-sm text-muted-foreground">
                                    {stats.total} task{stats.total !== 1 ? 's' : ''}
                                  </span>
                                </div>
                              </div>
                            </div>
                            {project.customer_phone && (
                              <p className="text-xs sm:text-sm text-muted-foreground mt-2 break-all">📞 {project.customer_phone}</p>
                            )}
                            {project.customer_email && (
                              <p className="text-xs sm:text-sm text-muted-foreground break-all">📧 {project.customer_email}</p>
                            )}
                          </div>
                          <div className="flex gap-2 w-full sm:w-auto">
                            <Button variant="outline" size="sm" onClick={() => handleEditProject(project)} className="flex-1 sm:flex-none">
                              <Pencil className="h-4 w-4" />
                              <span className="ml-1 sm:hidden">Edit</span>
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleAddTask(project.id)} className="flex-1 sm:flex-none">
                              <Plus className="h-4 w-4 mr-1" />
                              Add Task
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CollapsibleContent>
                        <CardContent className="pt-0">
                          {stats.total > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 p-3 bg-muted rounded-lg">
                              <div>
                                <p className="text-xs text-muted-foreground">Pending</p>
                                <p className="text-sm font-semibold text-yellow-600">{stats.pending}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">In Progress</p>
                                <p className="text-sm font-semibold text-blue-600">{stats.inProgress}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Completed</p>
                                <p className="text-sm font-semibold text-green-600">{stats.completed}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Total</p>
                                <p className="text-sm font-semibold">{stats.total}</p>
                              </div>
                            </div>
                          )}
                          
                          {tasksByProject[project.id] && tasksByProject[project.id].length > 0 ? (
                            <div className="space-y-2">
                              {tasksByProject[project.id].map((task) => (
                              <div key={task.id} className="border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                                  <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                                    <div className="flex-1 w-full">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <h4 className="font-medium text-sm sm:text-base">{task.title}</h4>
                                        <Badge className={getPriorityColor(task.priority)} variant="secondary">
                                          {task.priority}
                                        </Badge>
                                      </div>
                                      {task.description && (
                                        <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                                      )}
                                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-2 text-xs sm:text-sm text-muted-foreground">
                                        <span className="truncate">👤 {task.assigned_profile?.full_name || "Unassigned"}</span>
                                        {task.installation_address && (
                                          <span className="truncate">📍 {task.installation_address}</span>
                                        )}
                                        {task.due_date && (
                                          <span className="whitespace-nowrap">📅 Due: {format(new Date(task.due_date), "MMM d, yyyy")}</span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                      <Select
                                        value={task.status}
                                        onValueChange={(value) => updateTaskStatusMutation.mutate({ id: task.id, status: value })}
                                      >
                                        <SelectTrigger className="w-full sm:w-32 h-8 sm:h-10">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="pending">Pending</SelectItem>
                                          <SelectItem value="in_progress">In Progress</SelectItem>
                                          <SelectItem value="completed">Completed</SelectItem>
                                          <SelectItem value="cancelled">Cancelled</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full sm:w-auto"
                                        onClick={() => handleEditTask(task)}
                                      >
                                        <Pencil className="h-4 w-4 mr-1" />
                                        <span className="hidden sm:inline">Edit</span>
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full sm:w-auto"
                                        onClick={() => {
                                          setSelectedTaskForChat(task);
                                          setIsChatOpen(true);
                                        }}
                                      >
                                        <MessageSquare className="h-4 w-4 mr-1" />
                                        <span className="hidden sm:inline">Message</span>
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No tasks yet. Click "Add Task" to create one.
                            </p>
                          )}
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isTaskDialogOpen} onOpenChange={(open) => {
        setIsTaskDialogOpen(open);
        if (!open) {
          resetTaskForm();
          setSelectedProjectForTask(null);
          setEditingTask(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTask ? "Edit Task" : "Create New Task"}</DialogTitle>
            </DialogHeader>
          <form onSubmit={handleTaskSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">Task Title *</Label>
              <Input
                id="title"
                value={taskFormData.title}
                onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={taskFormData.description}
                onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select value={taskFormData.priority} onValueChange={(value) => setTaskFormData({ ...taskFormData, priority: value })}>
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
                <Select value={taskFormData.assigned_to} onValueChange={(value) => setTaskFormData({ ...taskFormData, assigned_to: value })}>
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
                value={taskFormData.due_date}
                onChange={(e) => setTaskFormData({ ...taskFormData, due_date: e.target.value })}
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
                    value={taskFormData.routers_used}
                    onChange={(e) => setTaskFormData({ ...taskFormData, routers_used: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="poe_adapters_used">POE Adapters</Label>
                  <Input
                    id="poe_adapters_used"
                    type="number"
                    min="0"
                    value={taskFormData.poe_adapters_used}
                    onChange={(e) => setTaskFormData({ ...taskFormData, poe_adapters_used: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="poles_used">Poles</Label>
                  <Input
                    id="poles_used"
                    type="number"
                    min="0"
                    value={taskFormData.poles_used}
                    onChange={(e) => setTaskFormData({ ...taskFormData, poles_used: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="anchors_used">Anchors</Label>
                  <Input
                    id="anchors_used"
                    type="number"
                    min="0"
                    value={taskFormData.anchors_used}
                    onChange={(e) => setTaskFormData({ ...taskFormData, anchors_used: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={editingTask ? updateTaskMutation.isPending : createTaskMutation.isPending}>
              {editingTask ? "Update Task" : "Create Task"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {selectedTaskForChat && (
        <TaskDetailsDialog
          task={selectedTaskForChat as any}
          isOpen={isChatOpen}
          onClose={() => { setIsChatOpen(false); setSelectedTaskForChat(null); }}
          currentUserId={userId}
        />
      )}
    </div>
  );
};
