import { User } from "@supabase/supabase-js";
import DashboardLayout from "./DashboardLayout";
import { TaskManagement } from "@/components/project-manager/TaskManagement";

interface ProjectManagerDashboardProps {
  user: User;
}

export const ProjectManagerDashboard = ({ user }: ProjectManagerDashboardProps) => {
  return (
    <DashboardLayout 
      title="Project Manager Dashboard" 
      subtitle="Manage installation tasks and assignments"
      userRole="project_manager"
    >
      <div className="space-y-6">        
        <TaskManagement userId={user.id} />
      </div>
    </DashboardLayout>
  );
};
