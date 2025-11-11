import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CheckCircle2, Loader2, Eye, FolderOpen, ChevronDown, ChevronRight, Search, Filter, CalendarIcon, X } from "lucide-react";
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { TaskDetailsDialog } from "./TaskDetailsDialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

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
  project?: {
    customer_name: string;
    customer_phone: string | null;
    customer_email: string | null;
    customer_address: string | null;
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
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

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
          assigned_profile:profiles!tasks_assigned_to_fkey(full_name, email),
          project:projects(customer_name, customer_phone, customer_email, customer_address)
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

  // Filter function
  const filterTasks = (tasks: Task[]) => {
    return tasks.filter(task => {
      // Search by customer name or task title
      const matchesSearch = searchQuery === "" || 
        task.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.project?.customer_name?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Filter by priority
      const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
      
      // Filter by date range
      let matchesDateRange = true;
      if (task.completed_at) {
        const completedDate = new Date(task.completed_at);
        if (dateFrom && dateTo) {
          matchesDateRange = isWithinInterval(completedDate, {
            start: startOfDay(dateFrom),
            end: endOfDay(dateTo)
          });
        } else if (dateFrom) {
          matchesDateRange = completedDate >= startOfDay(dateFrom);
        } else if (dateTo) {
          matchesDateRange = completedDate <= endOfDay(dateTo);
        }
      }
      
      return matchesSearch && matchesPriority && matchesDateRange;
    });
  };

  // Apply filters using useMemo for performance
  const filteredTasks = useMemo(() => {
    return filterTasks(completedTasks || []);
  }, [completedTasks, searchQuery, priorityFilter, dateFrom, dateTo]);

  const filteredProjects = useMemo(() => {
    if (!completedProjects) return [];
    return completedProjects.filter(project => {
      const matchesSearch = searchQuery === "" || 
        project.customer_name?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [completedProjects, searchQuery]);

  const getProjectTasks = (projectId: string) => {
    return filteredTasks.filter(task => task.project_id === projectId);
  };

  // Get all tasks with project_ids (regardless of project completion status)
  const tasksWithProjects = filteredTasks.filter(task => task.project_id);
  const uniqueProjectIds = [...new Set(tasksWithProjects.map(task => task.project_id))];
  
  // Get standalone tasks (no project_id)
  const standaloneCompletedTasks = filteredTasks.filter(task => !task.project_id);

  const hasActiveFilters = searchQuery !== "" || priorityFilter !== "all" || dateFrom || dateTo;

  const clearFilters = () => {
    setSearchQuery("");
    setPriorityFilter("all");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

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

  const totalCompleted = (filteredProjects?.length || 0) + (filteredTasks?.length || 0);

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
          {/* Filters Section */}
          <div className="mb-6 space-y-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Filters</h3>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-7 text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search by Customer/Task */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Customer or task name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Priority Filter */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Priority</label>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All priorities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All priorities</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date From */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">From Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateFrom && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Date To */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">To Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateTo && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
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
                    Showing: <span className="font-semibold text-foreground">{filteredTasks.length}</span> of {completedTasks?.length || 0} completed tasks
                  </p>
                  {filteredProjects.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">{filteredProjects.length}</span> completed projects
                    </p>
                  )}
                </div>
              </div>

              {/* Completed Projects with their tasks */}
              {filteredProjects.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <FolderOpen className="h-5 w-5" />
                    Completed Projects
                  </h3>
                  {filteredProjects.map((project) => {
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
                    
                    // Get project info from the first task with this project_id
                    const projectInfo = completedTasks?.find(t => t.project_id === projectId)?.project;

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
                                    <CardTitle className="text-lg">
                                      {projectInfo?.customer_name || "Project Tasks"}
                                    </CardTitle>
                                    <Badge variant="outline" className="bg-success/10 text-success">
                                      {projectTasks.length} completed
                                    </Badge>
                                  </div>
                                  <CardDescription className="mt-2 ml-7">
                                    {projectInfo?.customer_phone && (
                                      <span className="mr-4">📞 {projectInfo.customer_phone}</span>
                                    )}
                                    {projectInfo?.customer_email && (
                                      <span className="mr-4">✉️ {projectInfo.customer_email}</span>
                                    )}
                                    {projectInfo?.customer_address && (
                                      <span>📍 {projectInfo.customer_address}</span>
                                    )}
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
