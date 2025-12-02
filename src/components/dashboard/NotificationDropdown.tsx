import { useState, useEffect } from "react";
import { Bell, MessageSquare, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface TaskMessage {
  id: string;
  message: string;
  created_at: string;
  task_id: string;
  sender_id: string;
  task?: {
    title: string;
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
}

interface NotificationDropdownProps {
  userId?: string;
}

const NotificationDropdown = ({ userId }: NotificationDropdownProps) => {
  const [taskMessages, setTaskMessages] = useState<TaskMessage[]>([]);
  const [projectUpdates, setProjectUpdates] = useState<ProjectUpdate[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      // Fetch recent task messages
      const { data: messages, error: messagesError } = await supabase
        .from("task_messages")
        .select(`
          id,
          message,
          created_at,
          task_id,
          sender_id,
          tasks:task_id (title),
          profiles:sender_id (full_name)
        `)
        .order("created_at", { ascending: false })
        .limit(10);

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

      // Fetch recent project updates
      const { data: projects, error: projectsError } = await supabase
        .from("projects")
        .select("id, customer_name, project_status, updated_at")
        .order("updated_at", { ascending: false })
        .limit(5);

      if (projectsError) {
        console.error("Error fetching project updates:", projectsError);
      } else {
        setProjectUpdates(projects || []);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, userId]);

  // Set up real-time subscription for new messages
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "task_messages",
        },
        () => {
          if (isOpen) {
            fetchNotifications();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, isOpen]);

  const totalNotifications = taskMessages.length + projectUpdates.length;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9 md:h-10 md:w-10">
          <Bell className="h-4 w-4 md:h-5 md:w-5" />
          {totalNotifications > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-destructive text-destructive-foreground"
            >
              {totalNotifications > 9 ? "9+" : totalNotifications}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 md:w-96 p-0" align="end">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Notifications</h3>
          <p className="text-sm text-muted-foreground">Recent messages and updates</p>
        </div>
        
        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">
              Loading...
            </div>
          ) : (
            <div className="divide-y divide-border">
              {/* Task Messages Section */}
              {taskMessages.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-muted/50">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-2">
                      <MessageSquare className="h-3 w-3" />
                      Task Messages
                    </h4>
                  </div>
                  {taskMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className="px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <MessageSquare className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {msg.task?.title || "Task"}
                          </p>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {msg.sender?.full_name}: {msg.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(msg.created_at), "MMM dd, yyyy h:mm a")}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Project Updates Section */}
              {projectUpdates.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-muted/50">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-2">
                      <FolderOpen className="h-3 w-3" />
                      Project Updates
                    </h4>
                  </div>
                  {projectUpdates.map((project) => (
                    <div
                      key={project.id}
                      className="px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-8 w-8 rounded-full bg-secondary/50 flex items-center justify-center shrink-0">
                          <FolderOpen className="h-4 w-4 text-secondary-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {project.customer_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Status: {project.project_status}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(project.updated_at), "MMM dd, yyyy h:mm a")}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty State */}
              {taskMessages.length === 0 && projectUpdates.length === 0 && (
                <div className="p-8 text-center">
                  <Bell className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No notifications yet</p>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationDropdown;
