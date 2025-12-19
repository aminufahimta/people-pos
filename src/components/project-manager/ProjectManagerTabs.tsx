import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskManagement } from "./TaskManagement";
import { TaskBin } from "./TaskBin";
import { CompletedTasks } from "./CompletedTasks";
import { TaskReview } from "./TaskReview";
import { ClipboardList, Trash2, CheckCircle2, Clock } from "lucide-react";

interface ProjectManagerTabsProps {
  userId: string;
}

export const ProjectManagerTabs = ({ userId }: ProjectManagerTabsProps) => {
  const [activeTab, setActiveTab] = useState("tasks");
  
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
  const isProjectManager = userRole === "project_manager";
  const isNetworkManager = userRole === "network_manager";
  const isSales = userRole === "sales";
  const showBin = !isNetworkManager && !isSales;
  const showReview = isSuperAdmin || isProjectManager;

  // Calculate grid columns based on visible tabs
  const tabCount = 2 + (showReview ? 1 : 0) + (showBin ? 1 : 0);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className={`grid w-full max-w-3xl grid-cols-${tabCount}`}>
        <TabsTrigger value="tasks" className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          Tasks
        </TabsTrigger>
        {showReview && (
          <TabsTrigger value="review" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Review
          </TabsTrigger>
        )}
        <TabsTrigger value="completed" className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          Completed
        </TabsTrigger>
        {showBin && (
          <TabsTrigger value="bin" className="flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            Bin
          </TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="tasks" className="space-y-4">
        <TaskManagement 
          userId={userId} 
          userRole={userRole} 
          onNavigateToReview={() => setActiveTab("review")}
        />
      </TabsContent>

      {showReview && (
        <TabsContent value="review" className="space-y-4">
          <TaskReview userId={userId} userRole={userRole} />
        </TabsContent>
      )}

      <TabsContent value="completed" className="space-y-4">
        <CompletedTasks userId={userId} userRole={userRole} />
      </TabsContent>

      {showBin && (
        <TabsContent value="bin" className="space-y-4">
          <TaskBin userId={userId} isSuperAdmin={isSuperAdmin} />
        </TabsContent>
      )}
    </Tabs>
  );
};
