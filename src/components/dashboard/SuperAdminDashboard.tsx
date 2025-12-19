import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "./DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, DollarSign, Calendar, TrendingDown, LayoutDashboard, Settings, FileCheck, Package, ClipboardList, Bell, Activity, Trash2, CheckCircle2, Network, MessageSquare, Clock, Mail, CreditCard } from "lucide-react";
import { toast } from "sonner";
import EmployeeManagement from "@/components/admin/EmployeeManagement";
import AttendanceOverview from "@/components/admin/AttendanceOverview";
import SystemSettings from "@/components/admin/SystemSettings";
import SalaryManagement from "@/components/admin/SalaryManagement";
import ReportsGeneration from "@/components/admin/ReportsGeneration";
import HRManagerManagement from "@/components/admin/HRManagerManagement";
import NetworkManagerManagement from "@/components/admin/NetworkManagerManagement";
import SuspensionManagement from "@/components/admin/SuspensionManagement";
import DocumentVerification from "@/components/admin/DocumentVerification";
import { InventoryManagement } from "@/components/admin/InventoryManagement";
import { TaskManagement } from "@/components/project-manager/TaskManagement";
import { TaskBin } from "@/components/project-manager/TaskBin";
import { CompletedTasks } from "@/components/project-manager/CompletedTasks";
import { NotificationSettings } from "@/components/admin/NotificationSettings";
import { ActivityLogs } from "@/components/admin/ActivityLogs";
import BiodataSubmissions from "@/components/admin/BiodataSubmissions";
import { ProjectManagerTabs } from "@/components/project-manager/ProjectManagerTabs";
import { GrowthTasksManagement } from "@/components/admin/GrowthTasksManagement";
import { MessagesTab } from "./MessagesTab";
import { TaskReview } from "@/components/project-manager/TaskReview";
import EmailDeliveryLogs from "@/components/admin/EmailDeliveryLogs";
import { TaskPayments } from "@/components/admin/TaskPayments";

interface SuperAdminDashboardProps {
  user: User;
}

const SuperAdminDashboard = ({ user }: SuperAdminDashboardProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";

  const [stats, setStats] = useState({
    totalEmployees: 0,
    totalSalary: 0,
    presentToday: 0,
    totalDeductions: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const { data: profiles } = await supabase.from("profiles").select("*");
    
    const { data: salaries } = await supabase.from("salary_info").select("current_salary, total_deductions");
    
    const today = new Date().toISOString().split("T")[0];
    const { data: attendance } = await supabase
      .from("attendance")
      .select("*")
      .eq("date", today)
      .eq("status", "present");

    setStats({
      totalEmployees: profiles?.length || 0,
      totalSalary: salaries?.reduce((acc, s) => acc + Number(s.current_salary), 0) || 0,
      presentToday: attendance?.length || 0,
      totalDeductions: salaries?.reduce((acc, s) => acc + Number(s.total_deductions), 0) || 0,
    });
  };

  return (
    <DashboardLayout 
      title="Super Admin Dashboard" 
      subtitle="Complete system control and HR manager management"
      userRole="super_admin"
    >
      <Tabs value={activeTab} onValueChange={(value) => setSearchParams({ tab: value })} className="space-y-8">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            All Users
          </TabsTrigger>
          <TabsTrigger value="managers" className="flex items-center gap-2">
            HR Managers
          </TabsTrigger>
          <TabsTrigger value="network-managers" className="flex items-center gap-2">
            Network Managers
          </TabsTrigger>
          <TabsTrigger value="employees" className="flex items-center gap-2">
            Employees
          </TabsTrigger>
          <TabsTrigger value="attendance" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Attendance
          </TabsTrigger>
          <TabsTrigger value="network-manager" className="flex items-center gap-2">
            <Network className="h-4 w-4" />
            Network Manager
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Tasks
          </TabsTrigger>
          <TabsTrigger value="review" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Review
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Completed
          </TabsTrigger>
          <TabsTrigger value="bin" className="flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            Task Bin
          </TabsTrigger>
          <TabsTrigger value="salaries" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Salaries
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            Reports
          </TabsTrigger>
          <TabsTrigger value="suspensions" className="flex items-center gap-2">
            Suspensions
          </TabsTrigger>
          <TabsTrigger value="verification" className="flex items-center gap-2">
            <FileCheck className="h-4 w-4" />
            Document Verification
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Inventory
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Activity Logs
          </TabsTrigger>
          <TabsTrigger value="biodata" className="flex items-center gap-2">
            <FileCheck className="h-4 w-4" />
            Biodata Forms
          </TabsTrigger>
          <TabsTrigger value="growth-tasks" className="flex items-center gap-2">
            Growth Tasks
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Messages
          </TabsTrigger>
          <TabsTrigger value="email-logs" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Logs
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Payments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{stats.totalEmployees}</div>
                <p className="text-xs text-muted-foreground mt-1">All system users</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">System Attendance</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-success">
                  {stats.totalEmployees > 0 
                    ? Math.round((stats.presentToday / stats.totalEmployees) * 100) 
                    : 0}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">Organization-wide attendance</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Payroll</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  ₦{stats.totalSalary.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Monthly organization cost</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">System Health</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-success">98%</div>
                <p className="text-xs text-muted-foreground mt-1">Overall system performance</p>
              </CardContent>
            </Card>
          </div>

          <EmployeeManagement onUpdate={fetchStats} userRole="super_admin" />
          <AttendanceOverview />
        </TabsContent>

        <TabsContent value="users" className="space-y-8">
          <EmployeeManagement onUpdate={fetchStats} userRole="super_admin" />
        </TabsContent>

        <TabsContent value="managers" className="space-y-8">
          <HRManagerManagement onUpdate={fetchStats} />
        </TabsContent>

        <TabsContent value="network-managers" className="space-y-8">
          <NetworkManagerManagement onUpdate={fetchStats} />
        </TabsContent>

        <TabsContent value="employees" className="space-y-8">
          <EmployeeManagement onUpdate={fetchStats} userRole="super_admin" />
        </TabsContent>

        <TabsContent value="attendance" className="space-y-8">
          <AttendanceOverview />
        </TabsContent>

        <TabsContent value="network-manager" className="space-y-8">
          <ProjectManagerTabs userId={user.id} />
        </TabsContent>

        <TabsContent value="tasks" className="space-y-8">
          <TaskManagement userId={user.id} />
        </TabsContent>

        <TabsContent value="review" className="space-y-8">
          <TaskReview userId={user.id} userRole="super_admin" />
        </TabsContent>

        <TabsContent value="completed" className="space-y-8">
          <CompletedTasks userId={user.id} userRole="super_admin" />
        </TabsContent>

        <TabsContent value="bin" className="space-y-8">
          <TaskBin userId={user.id} isSuperAdmin={true} />
        </TabsContent>

        <TabsContent value="salaries" className="space-y-8">
          <SalaryManagement />
        </TabsContent>

        <TabsContent value="reports" className="space-y-8">
          <ReportsGeneration />
        </TabsContent>

        <TabsContent value="suspensions" className="space-y-8">
          <SuspensionManagement userRole="super_admin" currentUserId={user.id} />
        </TabsContent>

        <TabsContent value="verification" className="space-y-8">
          <DocumentVerification />
        </TabsContent>

        <TabsContent value="inventory" className="space-y-8">
          <InventoryManagement />
        </TabsContent>

        <TabsContent value="settings" className="space-y-8">
          <SystemSettings />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-8">
          <NotificationSettings />
        </TabsContent>

        <TabsContent value="logs" className="space-y-8">
          <ActivityLogs />
        </TabsContent>

        <TabsContent value="biodata" className="space-y-8">
          <BiodataSubmissions />
        </TabsContent>

        <TabsContent value="growth-tasks" className="space-y-8">
          <GrowthTasksManagement />
        </TabsContent>

        <TabsContent value="messages" className="space-y-8">
          <MessagesTab userId={user.id} />
        </TabsContent>

        <TabsContent value="email-logs" className="space-y-8">
          <EmailDeliveryLogs />
        </TabsContent>

        <TabsContent value="payments" className="space-y-8">
          <TaskPayments />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default SuperAdminDashboard;
