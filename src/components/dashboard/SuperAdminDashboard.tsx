import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "./DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, DollarSign, Calendar, TrendingDown, LayoutDashboard, Settings } from "lucide-react";
import EmployeeManagement from "@/components/admin/EmployeeManagement";
import AttendanceOverview from "@/components/admin/AttendanceOverview";
import SystemSettings from "@/components/admin/SystemSettings";

interface SuperAdminDashboardProps {
  user: User;
}

const SuperAdminDashboard = ({ user }: SuperAdminDashboardProps) => {
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
    <DashboardLayout title="Super Admin Dashboard" subtitle="Complete system control">
      <Tabs defaultValue="overview" className="space-y-8 animate-fade-in">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-8">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="shadow-[var(--shadow-elegant)] hover:shadow-[var(--shadow-glow)] transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalEmployees}</div>
              </CardContent>
            </Card>

            <Card className="shadow-[var(--shadow-elegant)] hover:shadow-[var(--shadow-glow)] transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Payroll</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ₦{stats.totalSalary.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-[var(--shadow-elegant)] hover:shadow-[var(--shadow-glow)] transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Present Today</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.presentToday}</div>
              </CardContent>
            </Card>

            <Card className="shadow-[var(--shadow-elegant)] hover:shadow-[var(--shadow-glow)] transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Deductions</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ₦{stats.totalDeductions.toLocaleString()}
                </div>
              </CardContent>
            </Card>
          </div>

          <EmployeeManagement onUpdate={fetchStats} />
          <AttendanceOverview />
        </TabsContent>

        <TabsContent value="settings" className="space-y-8">
          <SystemSettings />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default SuperAdminDashboard;
