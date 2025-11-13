import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Target, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface GrowthTask {
  id: string;
  title: string;
  description: string;
  target_roles: string[];
}

interface TaskCompletion {
  task_id: string;
  completed_at: string;
}

export const GrowthTaskWidget = ({ userId }: { userId: string }) => {
  const [tasks, setTasks] = useState<GrowthTask[]>([]);
  const [completions, setCompletions] = useState<TaskCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchTasksAndCompletions();
  }, [userId]);

  const fetchTasksAndCompletions = async () => {
    try {
      const [tasksResponse, completionsResponse] = await Promise.all([
        supabase.from("growth_tasks").select("*").eq("is_active", true),
        supabase
          .from("growth_task_completions")
          .select("task_id, completed_at")
          .eq("user_id", userId),
      ]);

      console.log("Growth tasks response:", tasksResponse);
      console.log("Growth tasks data:", tasksResponse.data);
      console.log("Growth tasks error:", tasksResponse.error);

      if (tasksResponse.error) {
        console.error("Growth tasks RLS error:", tasksResponse.error);
        throw tasksResponse.error;
      }
      if (completionsResponse.error) throw completionsResponse.error;

      setTasks(tasksResponse.data || []);
      setCompletions(completionsResponse.data || []);
    } catch (error) {
      console.error("Error fetching growth tasks:", error);
      toast({
        title: "Error loading growth tasks",
        description: error instanceof Error ? error.message : "Please check your permissions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from("growth_task_completions")
        .upsert(
          {
            task_id: taskId,
            user_id: userId,
            completed_at: new Date().toISOString(),
          },
          { onConflict: "task_id,user_id" }
        );

      if (error) throw error;

      toast({
        title: "Task Completed!",
        description: "Great work! This task will appear again next week.",
      });

      fetchTasksAndCompletions();
    } catch (error) {
      console.error("Error completing task:", error);
      toast({
        title: "Error",
        description: "Failed to mark task as complete",
        variant: "destructive",
      });
    }
  };

  const isTaskAvailable = (taskId: string) => {
    const completion = completions.find((c) => c.task_id === taskId);
    if (!completion) return true;

    const completedDate = new Date(completion.completed_at);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    return completedDate < weekAgo;
  };

  const getLastCompletedDate = (taskId: string) => {
    const completion = completions.find((c) => c.task_id === taskId);
    if (!completion) return null;
    return completion.completed_at;
  };

  const availableTasks = tasks.filter((task) => isTaskAvailable(task.id));

  if (loading) return null;
  if (availableTasks.length === 0) return null;

  return (
    <Card className="mb-6 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <Target className="h-5 w-5" />
          Growth Tasks
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Complete these tasks to help grow the company
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {availableTasks.map((task) => {
          const lastCompleted = getLastCompletedDate(task.id);
          return (
            <Card key={task.id} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">{task.title}</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      {task.description}
                    </p>
                    {lastCompleted && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Last completed{" "}
                        {formatDistanceToNow(new Date(lastCompleted), {
                          addSuffix: true,
                        })}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleCompleteTask(task.id)}
                    className="w-full sm:w-auto"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Mark Complete
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </CardContent>
    </Card>
  );
};
