import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, Eye, FolderOpen, ChevronDown, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { TaskDetailsDialog } from "./TaskDetailsDialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Project {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  customer_address: string | null;
  project_status: string;
  created_at: string;
  updated_at: string;
}

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
  project_id: string | null;
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
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  const { data: completedProjects, isLoading: projectsLoading } = useQuery({
    queryKey: ["completed-projects", userId, userRole],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("project_status", "completed")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data as Project[];
    },
  });

  const { data: completedTasks, isLoading: tasksLoading } = useQuery({
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

  const toggleProject = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  const getProjectTasks = (projectId: string) => {
    return completedTasks?.filter(task => task.project_id === projectId) || [];
  };

  // Get all tasks with project_ids (regardless of project completion status)
  const tasksWithProjects = completedTasks?.filter(task => task.project_id) || [];
  const uniqueProjectIds = [...new Set(tasksWithProjects.map(task => task.project_id))];
  
  // Get standalone tasks (no project_id)
  const standaloneCompletedTasks = completedTasks?.filter(task => !task.project_id) || [];

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

  const isLoading = projectsLoading || tasksLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalCompleted = (completedProjects?.length || 0) + (completedTasks?.length || 0);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <div>
              <CardTitle>Completed Projects & Tasks</CardTitle>
              <CardDescription>
                View all completed projects and their tasks
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {totalCompleted === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle2 className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No completed items yet</p>
              <p className="text-sm mt-2">Completed projects and tasks will appear here</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Total: <span className="font-semibold text-foreground">{completedTasks?.length || 0}</span> completed tasks
                  </p>
                  {completedProjects && completedProjects.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">{completedProjects.length}</span> completed projects
                    </p>
                  )}
                </div>
              </div>

              {/* Completed Projects with their tasks */}
              {completedProjects && completedProjects.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <FolderOpen className="h-5 w-5" />
                    Completed Projects
                  </h3>
                  {completedProjects.map((project) => {
                    const projectTasks = getProjectTasks(project.id);
                    const isExpanded = expandedProjects.has(project.id);

                    return (
                      <Collapsible
                        key={project.id}
                        open={isExpanded}
                        onOpenChange={() => toggleProject(project.id)}
                      >
                        <Card>
                          <CollapsibleTrigger asChild>
                            <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    {isExpanded ? (
                                      <ChevronDown className="h-5 w-5" />
                                    ) : (
                                      <ChevronRight className="h-5 w-5" />
                                    )}
                                    <CardTitle className="text-lg">{project.customer_name}</CardTitle>
                                    <Badge variant="outline" className="bg-success/10 text-success">
                                      Completed
                                    </Badge>
                                  </div>
                                  <CardDescription className="mt-2 ml-7">
                                    {project.customer_phone && (
                                      <span className="mr-4">📞 {project.customer_phone}</span>
                                    )}
                                    {project.customer_email && (
                                      <span className="mr-4">✉️ {project.customer_email}</span>
                                    )}
                                    {project.customer_address && (
                                      <span>📍 {project.customer_address}</span>
                                    )}
                                  </CardDescription>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {projectTasks.length} {projectTasks.length === 1 ? 'task' : 'tasks'}
                                </div>
                              </div>
                            </CardHeader>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <CardContent>
                              {projectTasks.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                  No tasks in this project
                                </p>
                              ) : (
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Task</TableHead>
                                      <TableHead>Assigned To</TableHead>
                                      <TableHead>Priority</TableHead>
                                      <TableHead>Completed Date</TableHead>
                                      <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {projectTasks.map((task) => (
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
                              )}
                            </CardContent>
                          </CollapsibleContent>
                        </Card>
                      </Collapsible>
                    );
                  })}
                </div>
              )}

              {/* Tasks by Project (for active projects with completed tasks) */}
              {uniqueProjectIds.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    Completed Tasks by Project
                  </h3>
                  {uniqueProjectIds.map((projectId) => {
                    const projectTasks = getProjectTasks(projectId!);
                    const isExpanded = expandedProjects.has(projectId!);
                    
                    // Get project info if available
                    const projectInfo = completedTasks?.find(t => t.project_id === projectId);

                    return (
                      <Collapsible
                        key={projectId}
                        open={isExpanded}
                        onOpenChange={() => toggleProject(projectId!)}
                      >
                        <Card>
                          <CollapsibleTrigger asChild>
                            <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    {isExpanded ? (
                                      <ChevronDown className="h-5 w-5" />
                                    ) : (
                                      <ChevronRight className="h-5 w-5" />
                                    )}
                                    <CardTitle className="text-lg">Project Tasks</CardTitle>
                                    <Badge variant="outline" className="bg-success/10 text-success">
                                      {projectTasks.length} completed
                                    </Badge>
                                  </div>
                                  <CardDescription className="mt-2 ml-7">
                                    Project ID: {projectId?.substring(0, 8)}...
                                  </CardDescription>
                                </div>
                              </div>
                            </CardHeader>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <CardContent>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Task</TableHead>
                                    <TableHead>Assigned To</TableHead>
                                    <TableHead>Priority</TableHead>
                                    <TableHead>Completed Date</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {projectTasks.map((task) => (
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
                            </CardContent>
                          </CollapsibleContent>
                        </Card>
                      </Collapsible>
                    );
                  })}
                </div>
              )}

              {/* Standalone Completed Tasks */}
              {standaloneCompletedTasks.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    Standalone Completed Tasks
                  </h3>
                  <Card>
                    <CardContent className="pt-6">
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
                          {standaloneCompletedTasks.map((task) => (
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
                    </CardContent>
                  </Card>
                </div>
              )}
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
