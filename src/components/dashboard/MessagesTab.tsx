import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Search, FolderOpen } from "lucide-react";
import { format } from "date-fns";

interface TaskMessage {
  id: string;
  message: string;
  created_at: string;
  task_id: string;
  sender_id: string;
  task?: {
    title: string;
    status: string;
    customer_name: string | null;
  };
  sender?: {
    full_name: string;
  };
}

interface ProjectUpdate {
  id: string;
  customer_name: string;
  project_status: string;
  updated_at: string;
  created_at: string;
  notes: string | null;
}

interface MessagesTabProps {
  userId: string;
}

export const MessagesTab = ({ userId }: MessagesTabProps) => {
  const [taskMessages, setTaskMessages] = useState<TaskMessage[]>([]);
  const [projectUpdates, setProjectUpdates] = useState<ProjectUpdate[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all task messages
      const { data: messages, error: messagesError } = await supabase
        .from("task_messages")
        .select(`
          id,
          message,
          created_at,
          task_id,
          sender_id,
          tasks:task_id (title, status, customer_name),
          profiles:sender_id (full_name)
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (messagesError) {
        console.error("Error fetching task messages:", messagesError);
      } else {
        const formattedMessages = (messages || []).map((msg: any) => ({
          ...msg,
          task: msg.tasks,
          sender: msg.profiles,
        }));
        setTaskMessages(formattedMessages);
      }

      // Fetch all project updates
      const { data: projects, error: projectsError } = await supabase
        .from("projects")
        .select("id, customer_name, project_status, updated_at, created_at, notes")
        .order("updated_at", { ascending: false })
        .limit(50);

      if (projectsError) {
        console.error("Error fetching project updates:", projectsError);
      } else {
        setProjectUpdates(projects || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userId]);

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("messages-tab")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "task_messages",
        },
        () => {
          fetchData();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "projects",
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Filter messages based on search query
  const filteredMessages = taskMessages.filter(
    (msg) =>
      msg.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.task?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.sender?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.task?.customer_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredProjects = projectUpdates.filter(
    (project) =>
      project.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.project_status.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.notes?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      in_progress: "default",
      completed: "outline",
      cancelled: "destructive",
      active: "default",
      inactive: "secondary",
    };
    return variants[status] || "secondary";
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search messages, tasks, or projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Task Messages */}
        <Card className="shadow-[var(--shadow-elegant)]">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="h-5 w-5 text-primary" />
              Task Messages
              <Badge variant="secondary" className="ml-auto">
                {filteredMessages.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              {loading ? (
                <div className="p-4 text-center text-muted-foreground">Loading...</div>
              ) : filteredMessages.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No messages found</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className="p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <MessageSquare className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-foreground">
                              {msg.sender?.full_name || "Unknown"}
                            </p>
                            {msg.task?.status && (
                              <Badge variant={getStatusBadge(msg.task.status)} className="text-xs">
                                {msg.task.status}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            on <span className="font-medium">{msg.task?.title || "Unknown Task"}</span>
                            {msg.task?.customer_name && (
                              <span className="text-muted-foreground"> • {msg.task.customer_name}</span>
                            )}
                          </p>
                          <p className="text-sm text-foreground mt-2 whitespace-pre-wrap">
                            {msg.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {format(new Date(msg.created_at), "MMM dd, yyyy h:mm a")}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Project Updates */}
        <Card className="shadow-[var(--shadow-elegant)]">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FolderOpen className="h-5 w-5 text-accent" />
              Project Updates
              <Badge variant="secondary" className="ml-auto">
                {filteredProjects.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              {loading ? (
                <div className="p-4 text-center text-muted-foreground">Loading...</div>
              ) : filteredProjects.length === 0 ? (
                <div className="p-8 text-center">
                  <FolderOpen className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No projects found</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredProjects.map((project) => (
                    <div
                      key={project.id}
                      className="p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                          <FolderOpen className="h-5 w-5 text-accent" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-foreground">
                              {project.customer_name}
                            </p>
                            <Badge variant={getStatusBadge(project.project_status)} className="text-xs">
                              {project.project_status}
                            </Badge>
                          </div>
                          {project.notes && (
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                              {project.notes}
                            </p>
                          )}
                          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                            <span>Created: {format(new Date(project.created_at), "MMM dd, yyyy")}</span>
                            <span>Updated: {format(new Date(project.updated_at), "MMM dd, yyyy h:mm a")}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
