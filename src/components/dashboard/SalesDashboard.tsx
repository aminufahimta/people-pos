import { User } from "@supabase/supabase-js";
import DashboardLayout from "./DashboardLayout";
import { ProjectManagerTabs } from "@/components/project-manager/ProjectManagerTabs";

interface SalesDashboardProps {
  user: User;
}

export const SalesDashboard = ({ user }: SalesDashboardProps) => {
  return (
    <DashboardLayout userRole="sales" title="Sales Dashboard" subtitle="Manage tasks and track customer projects">
      <div className="space-y-6">
        <ProjectManagerTabs userId={user.id} />
      </div>
    </DashboardLayout>
  );
};
