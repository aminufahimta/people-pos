import { User } from "@supabase/supabase-js";
import DashboardLayout from "./DashboardLayout";
import { ProjectManagerTabs } from "@/components/project-manager/ProjectManagerTabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, MessageSquare } from "lucide-react";

interface NetworkManagerDashboardProps {
  user: User;
}

const NetworkManagerDashboard = ({ user }: NetworkManagerDashboardProps) => {
  return (
    <DashboardLayout 
      title="Network Manager Dashboard" 
      subtitle="Monitor and support ongoing tasks"
      userRole="network_manager"
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Task Overview</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardDescription>
                View and monitor all tasks, update statuses, and provide technical support
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Communication</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardDescription>
                Comment on tasks and collaborate with technicians and project managers
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <ProjectManagerTabs userId={user.id} />
      </div>
    </DashboardLayout>
  );
};

export default NetworkManagerDashboard;
