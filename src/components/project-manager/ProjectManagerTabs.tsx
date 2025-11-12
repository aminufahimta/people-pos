import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskManagement } from "./TaskManagement";
import { TaskBin } from "./TaskBin";
import { CompletedTasks } from "./CompletedTasks";
import { ClipboardList, Trash2, CheckCircle2 } from "lucide-react";

interface ProjectManagerTabsProps {
  userId: string;
}

export const ProjectManagerTabs = ({ userId }: ProjectManagerTabsProps) => {
  const { data: userRole } = useQuery({
    queryKey: ["user-role", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .single();

      if (error) throw error;
      return data.role;
    },
  });

  const isSuperAdmin = userRole === "super_admin";

  return (
    <Tabs defaultValue="tasks" className="w-full">
      <TabsList className="grid w-full max-w-2xl grid-cols-3">
        <TabsTrigger value="tasks" className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          Tasks
        </TabsTrigger>
        <TabsTrigger value="completed" className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          Completed
        </TabsTrigger>
        <TabsTrigger value="bin" className="flex items-center gap-2">
          <Trash2 className="h-4 w-4" />
          Bin
        </TabsTrigger>
      </TabsList>

      <TabsContent value="tasks" className="space-y-4">
        <TaskManagement userId={userId} userRole={userRole} />
      </TabsContent>

      <TabsContent value="completed" className="space-y-4">
        <CompletedTasks userId={userId} userRole={userRole} />
      </TabsContent>

      <TabsContent value="bin" className="space-y-4">
        <TaskBin userId={userId} isSuperAdmin={isSuperAdmin} />
      </TabsContent>
    </Tabs>
  );
};
