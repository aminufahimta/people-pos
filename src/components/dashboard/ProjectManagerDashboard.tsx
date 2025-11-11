import { User } from "@supabase/supabase-js";
import DashboardLayout from "./DashboardLayout";
import { ProjectManagerTabs } from "@/components/project-manager/ProjectManagerTabs";

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
      <ProjectManagerTabs userId={user.id} />
    </DashboardLayout>
  );
};
