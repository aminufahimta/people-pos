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
import { CheckCircle2, Loader2, Eye, ChevronDown, ChevronRight, Search, Filter, CalendarIcon, X } from "lucide-react";
import { format, isWithinInterval, startOfDay, endOfDay, isToday, isYesterday } from "date-fns";
import { TaskDetailsDialog } from "./TaskDetailsDialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

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

interface TasksByDate {
  [date: string]: Task[];
}

export const CompletedTasks = ({ userId, userRole }: CompletedTasksProps) => {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

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

  const toggleDate = (dateKey: string) => {
    const newExpanded = new Set(expandedDates);
    if (newExpanded.has(dateKey)) {
      newExpanded.delete(dateKey);
    } else {
      newExpanded.add(dateKey);
    }
    setExpandedDates(newExpanded);
  };

  const expandAll = () => {
    if (tasksByDate) {
      setExpandedDates(new Set(Object.keys(tasksByDate)));
    }
  };

  const collapseAll = () => {
    setExpandedDates(new Set());
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

  // Group tasks by completion date
  const tasksByDate = useMemo((): TasksByDate => {
    const grouped: TasksByDate = {};
    
    filteredTasks.forEach(task => {
      if (task.completed_at) {
        const dateKey = format(new Date(task.completed_at), "yyyy-MM-dd");
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(task);
      }
    });
    
    return grouped;
  }, [filteredTasks]);

  // Get sorted date keys (most recent first)
  const sortedDateKeys = useMemo(() => {
    return Object.keys(tasksByDate).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  }, [tasksByDate]);

  const getDateLabel = (dateKey: string) => {
    const date = new Date(dateKey);
    if (isToday(date)) {
      return "Today";
    }
    if (isYesterday(date)) {
      return "Yesterday";
    }
    return format(date, "EEEE, MMMM dd, yyyy");
  };

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

  if (tasksLoading) {
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
                View all completed tasks organized by completion date
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

          {filteredTasks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle2 className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No completed tasks yet</p>
              <p className="text-sm mt-2">Completed tasks will appear here organized by date</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary and Controls */}
              <div className="flex items-center justify-between flex-wrap gap-4">
                <p className="text-sm text-muted-foreground">
                  Showing <span className="font-semibold text-foreground">{filteredTasks.length}</span> completed tasks across{" "}
                  <span className="font-semibold text-foreground">{sortedDateKeys.length}</span> days
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={expandAll}>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Expand All
                  </Button>
                  <Button variant="outline" size="sm" onClick={collapseAll}>
                    <ChevronRight className="h-4 w-4 mr-1" />
                    Collapse All
                  </Button>
                </div>
              </div>

              {/* Tasks grouped by date */}
              <div className="space-y-3">
                {sortedDateKeys.map((dateKey) => {
                  const dayTasks = tasksByDate[dateKey];
                  const isExpanded = expandedDates.has(dateKey);
                  const dateLabel = getDateLabel(dateKey);

                  return (
                    <Collapsible
                      key={dateKey}
                      open={isExpanded}
                      onOpenChange={() => toggleDate(dateKey)}
                    >
                      <Card className="overflow-hidden">
                        <CollapsibleTrigger asChild>
                          <div className="cursor-pointer hover:bg-accent/50 transition-colors px-4 py-3 flex items-center justify-between border-b">
                            <div className="flex items-center gap-3">
                              {isExpanded ? (
                                <ChevronDown className="h-5 w-5 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                              )}
                              <div className="flex items-center gap-2">
                                <CalendarIcon className="h-4 w-4 text-primary" />
                                <span className="font-semibold text-lg">{dateLabel}</span>
                              </div>
                            </div>
                            <Badge variant="secondary" className="text-sm">
                              {dayTasks.length} {dayTasks.length === 1 ? 'task' : 'tasks'}
                            </Badge>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent className="p-0">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Task</TableHead>
                                  <TableHead>Customer/Project</TableHead>
                                  <TableHead>Assigned To</TableHead>
                                  <TableHead>Priority</TableHead>
                                  <TableHead>Time</TableHead>
                                  <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {dayTasks.map((task) => (
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
                                      {task.project?.customer_name || task.customer_name || (
                                        <span className="text-muted-foreground">N/A</span>
                                      )}
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
                                        ? format(new Date(task.completed_at), "hh:mm a")
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
