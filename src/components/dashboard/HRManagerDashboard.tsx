import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "./DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, DollarSign, Calendar, TrendingDown, LayoutDashboard, FileCheck } from "lucide-react";
import EmployeeManagement from "@/components/admin/EmployeeManagement";
import AttendanceOverview from "@/components/admin/AttendanceOverview";
import SalaryManagement from "@/components/admin/SalaryManagement";
import ReportsGeneration from "@/components/admin/ReportsGeneration";
import SuspensionManagement from "@/components/admin/SuspensionManagement";
import DocumentVerification from "@/components/admin/DocumentVerification";
import EmployeeAuditList from "@/components/admin/EmployeeAuditList";

interface HRManagerDashboardProps {
  user: User;
}

const HRManagerDashboard = ({ user }: HRManagerDashboardProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";

  const [stats, setStats] = useState({
    totalEmployees: 0,
    totalSalary: 0,
    presentToday: 0,
    absentToday: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const { data: profiles } = await supabase.from("profiles").select("*");
    
    const { data: salaries } = await supabase.from("salary_info").select("current_salary");
    
    const today = new Date().toISOString().split("T")[0];
    const { data: attendance } = await supabase
      .from("attendance")
      .select("*")
      .eq("date", today)
      .eq("status", "present");

    const { data: absent } = await supabase
      .from("attendance")
      .select("*")
      .eq("date", today)
      .eq("status", "absent");

    setStats({
      totalEmployees: profiles?.length || 0,
      totalSalary: salaries?.reduce((acc, s) => acc + Number(s.current_salary), 0) || 0,
      presentToday: attendance?.length || 0,
      absentToday: absent?.length || 0,
    });
  };

  return (
    <DashboardLayout 
      title="HR Manager Dashboard" 
      subtitle="Employee management & attendance"
      userRole="hr_manager"
    >
      <Tabs value={activeTab} onValueChange={(value) => setSearchParams({ tab: value })} className="space-y-8">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="employees" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Employees
          </TabsTrigger>
          <TabsTrigger value="attendance" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Attendance
          </TabsTrigger>
          <TabsTrigger value="salaries" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Salaries
          </TabsTrigger>
          <TabsTrigger value="suspensions" className="flex items-center gap-2">
            Suspensions
          </TabsTrigger>
          <TabsTrigger value="verification" className="flex items-center gap-2">
            <FileCheck className="h-4 w-4" />
            Document Verification
          </TabsTrigger>
          <TabsTrigger value="audits" className="flex items-center gap-2">
            Employee Audit
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Employees</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{stats.totalEmployees}</div>
                <p className="text-xs text-muted-foreground mt-1">Active employees</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">Attendance Rate</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-success">
                  {stats.totalEmployees > 0 
                    ? Math.round((stats.presentToday / stats.totalEmployees) * 100) 
                    : 0}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">Present today</p>
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
                <p className="text-xs text-muted-foreground mt-1">Monthly total</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">Absent Today</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-destructive">{stats.absentToday}</div>
                <p className="text-xs text-muted-foreground mt-1">Employees absent</p>
              </CardContent>
            </Card>
          </div>

          <EmployeeManagement onUpdate={fetchStats} userRole="hr_manager" />
          <AttendanceOverview />
        </TabsContent>

        <TabsContent value="employees" className="space-y-8">
          <EmployeeManagement onUpdate={fetchStats} userRole="hr_manager" />
        </TabsContent>

        <TabsContent value="attendance" className="space-y-8">
          <AttendanceOverview />
        </TabsContent>

        <TabsContent value="salaries" className="space-y-8">
          <SalaryManagement />
        </TabsContent>

        <TabsContent value="suspensions" className="space-y-8">
          <SuspensionManagement userRole="hr_manager" currentUserId={user.id} />
        </TabsContent>

        <TabsContent value="verification" className="space-y-8">
          <DocumentVerification />
        </TabsContent>

        <TabsContent value="audits" className="space-y-8">
          <EmployeeAuditList />
        </TabsContent>

        <TabsContent value="reports" className="space-y-8">
          <ReportsGeneration />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default HRManagerDashboard;
