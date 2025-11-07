import { User } from "@supabase/supabase-js";
import DashboardLayout from "./DashboardLayout";
import { ProjectManagement } from "@/components/project-manager/ProjectManagement";

interface ProjectManagerDashboardProps {
  user: User;
}

export const ProjectManagerDashboard = ({ user }: ProjectManagerDashboardProps) => {
  return (
    <DashboardLayout 
      title="Project Manager Dashboard" 
      subtitle="Manage customer projects and tasks"
      userRole="project_manager"
    >
      <ProjectManagement userId={user.id} />
    </DashboardLayout>
  );
};
