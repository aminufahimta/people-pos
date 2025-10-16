import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";

interface Suspension {
  id: string;
  user_id: string;
  created_by: string;
  approved_by: string | null;
  status: string;
  suspension_start: string | null;
  suspension_end: string;
  reason: string;
  strike_number: number | null;
  salary_deduction_percentage: number;
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
    strike_count: number;
  };
  creator: {
    full_name: string;
  };
  approver?: {
    full_name: string;
  };
}

interface SuspensionManagementProps {
  userRole: string;
  currentUserId: string;
}

const SuspensionManagement = ({ userRole, currentUserId }: SuspensionManagementProps) => {
  const [suspensions, setSuspensions] = useState<Suspension[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    user_id: "",
    reason: "",
    duration_days: "7",
    strike_number: "0",
    salary_deduction: "0",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchSuspensions();
    fetchEmployees();
  }, []);

  const fetchSuspensions = async () => {
    const { data, error } = await supabase
      .from("suspensions")
      .select(`
        *,
        profiles!suspensions_user_id_fkey (full_name, email, strike_count),
        creator:profiles!suspensions_created_by_fkey (full_name),
        approver:profiles!suspensions_approved_by_fkey (full_name)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch suspensions",
        variant: "destructive",
      });
    } else {
      setSuspensions(data || []);
    }
  };

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from("profiles")
      .select(`
        *,
        user_roles (role)
      `)
      .eq("user_roles.role", "employee")
      .order("full_name");

    setEmployees(data || []);
  };

  const handleCreateSuspension = async () => {
    const suspensionEnd = new Date();
    suspensionEnd.setDate(suspensionEnd.getDate() + parseInt(formData.duration_days));
    const strikeNumber = parseInt(formData.strike_number) || null;

    // Check if this is strike 3 (termination)
    if (strikeNumber === 3) {
      const { error: terminateError } = await supabase
        .from("profiles")
        .update({ is_terminated: true })
        .eq("id", formData.user_id);

      if (terminateError) {
        toast({
          title: "Error",
          description: "Failed to terminate employee",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Employee Terminated",
        description: "Strike 3: Employee has been terminated",
        variant: "destructive",
      });
      setIsCreateOpen(false);
      fetchSuspensions();
      return;
    }

    const suspensionData: any = {
      user_id: formData.user_id,
      created_by: currentUserId,
      reason: formData.reason,
      suspension_end: suspensionEnd.toISOString(),
      strike_number: strikeNumber,
      salary_deduction_percentage: parseFloat(formData.salary_deduction) || 0,
    };

    // Super Admin can activate immediately
    if (userRole === "super_admin") {
      suspensionData.status = "active";
      suspensionData.approved_by = currentUserId;
      suspensionData.suspension_start = new Date().toISOString();
    }

    const { data: insertedSuspension, error } = await supabase
      .from("suspensions")
      .insert(suspensionData)
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create suspension",
        variant: "destructive",
      });
      return;
    }

    // If Super Admin, immediately update profile
    if (userRole === "super_admin" && insertedSuspension) {
      // Get current strike count
      const { data: profileData } = await supabase
        .from("profiles")
        .select("strike_count")
        .eq("id", formData.user_id)
        .single();

      const currentStrikes = profileData?.strike_count || 0;
      const newStrikes = currentStrikes + (strikeNumber || 0);

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          is_suspended: true,
          suspension_end_date: suspensionEnd.toISOString(),
          strike_count: newStrikes
        })
        .eq("id", formData.user_id);

      if (profileError) {
        toast({
          title: "Error",
          description: "Failed to activate suspension",
          variant: "destructive",
        });
        return;
      }

      // Apply salary deduction if any
      if (parseFloat(formData.salary_deduction) > 0) {
        const { data: salaryData } = await supabase
          .from("salary_info")
          .select("base_salary, current_salary, total_deductions")
          .eq("user_id", formData.user_id)
          .single();

        if (salaryData) {
          const deductionAmount = (salaryData.current_salary * parseFloat(formData.salary_deduction)) / 100;
          await supabase
            .from("salary_info")
            .update({
              current_salary: salaryData.current_salary - deductionAmount,
              total_deductions: (salaryData.total_deductions || 0) + deductionAmount
            })
            .eq("user_id", formData.user_id);
        }
      }
    }

    toast({
      title: "Success",
      description: userRole === "super_admin" 
        ? "Suspension activated successfully" 
        : "Suspension request submitted for approval",
    });
    setIsCreateOpen(false);
    setFormData({
      user_id: "",
      reason: "",
      duration_days: "7",
      strike_number: "0",
      salary_deduction: "0",
    });
    fetchSuspensions();
  };

  const handleApproveSuspension = async (suspensionId: string) => {
    // Get suspension details first
    const { data: suspension, error: fetchError } = await supabase
      .from("suspensions")
      .select("*")
      .eq("id", suspensionId)
      .single();

    if (fetchError || !suspension) {
      toast({
        title: "Error",
        description: "Failed to fetch suspension details",
        variant: "destructive",
      });
      return;
    }

    // Update suspension to active
    const { error: updateError } = await supabase
      .from("suspensions")
      .update({
        status: "active",
        approved_by: currentUserId,
        suspension_start: new Date().toISOString(),
      })
      .eq("id", suspensionId);

    if (updateError) {
      toast({
        title: "Error",
        description: "Failed to approve suspension",
        variant: "destructive",
      });
      return;
    }

    // Update profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("strike_count")
      .eq("id", suspension.user_id)
      .single();

    const currentStrikes = profileData?.strike_count || 0;
    const newStrikes = currentStrikes + (suspension.strike_number || 0);

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        is_suspended: true,
        suspension_end_date: suspension.suspension_end,
        strike_count: newStrikes
      })
      .eq("id", suspension.user_id);

    if (profileError) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
      return;
    }

    // Apply salary deduction if any
    if (suspension.salary_deduction_percentage > 0) {
      const { data: salaryData } = await supabase
        .from("salary_info")
        .select("base_salary, current_salary, total_deductions")
        .eq("user_id", suspension.user_id)
        .single();

      if (salaryData) {
        const deductionAmount = (salaryData.current_salary * suspension.salary_deduction_percentage) / 100;
        await supabase
          .from("salary_info")
          .update({
            current_salary: salaryData.current_salary - deductionAmount,
            total_deductions: (salaryData.total_deductions || 0) + deductionAmount
          })
          .eq("user_id", suspension.user_id);
      }
    }

    toast({
      title: "Success",
      description: "Suspension approved and activated",
    });
    fetchSuspensions();
  };

  const handleRejectSuspension = async (suspensionId: string) => {
    const { error } = await supabase
      .from("suspensions")
      .update({ status: "rejected" })
      .eq("id", suspensionId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to reject suspension",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Suspension rejected",
      });
      fetchSuspensions();
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { icon: any; variant: any; label: string }> = {
      pending: { icon: Clock, variant: "secondary", label: "Pending" },
      approved: { icon: CheckCircle, variant: "default", label: "Approved" },
      active: { icon: AlertCircle, variant: "destructive", label: "Active" },
      completed: { icon: CheckCircle, variant: "outline", label: "Completed" },
      rejected: { icon: XCircle, variant: "outline", label: "Rejected" },
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  return (
    <Card className="shadow-[var(--shadow-elegant)]">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Suspension Management</CardTitle>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>Create Suspension</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Employee Suspension</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Employee</Label>
                <Select value={formData.user_id} onValueChange={(value) => setFormData({ ...formData, user_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.full_name} - Strike {emp.strike_count || 0}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Reason</Label>
                <Textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Enter suspension reason"
                />
              </div>
              <div>
                <Label>Duration (Days)</Label>
                <Input
                  type="number"
                  value={formData.duration_days}
                  onChange={(e) => setFormData({ ...formData, duration_days: e.target.value })}
                  min="1"
                />
              </div>
              <div>
                <Label>Strike Number (0 for warning only)</Label>
                <Select value={formData.strike_number} onValueChange={(value) => setFormData({ ...formData, strike_number: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Warning Only</SelectItem>
                    <SelectItem value="1">Strike 1 (1 week, 30% deduction)</SelectItem>
                    <SelectItem value="2">Strike 2 (1 month, no pay)</SelectItem>
                    <SelectItem value="3">Strike 3 (Termination)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Salary Deduction (%)</Label>
                <Input
                  type="number"
                  value={formData.salary_deduction}
                  onChange={(e) => setFormData({ ...formData, salary_deduction: e.target.value })}
                  min="0"
                  max="100"
                />
              </div>
              <Button onClick={handleCreateSuspension} className="w-full">
                {userRole === "super_admin" ? "Create & Activate" : "Submit for Approval"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Strike</TableHead>
              <TableHead>Deduction</TableHead>
              <TableHead>End Date</TableHead>
              <TableHead>Created By</TableHead>
              {userRole === "super_admin" && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {suspensions.map((suspension) => (
              <TableRow key={suspension.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{suspension.profiles?.full_name}</div>
                    <div className="text-sm text-muted-foreground">
                      Total Strikes: {suspension.profiles?.strike_count || 0}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="max-w-xs truncate">{suspension.reason}</TableCell>
                <TableCell>{getStatusBadge(suspension.status)}</TableCell>
                <TableCell>
                  {suspension.strike_number ? (
                    <Badge variant="destructive">Strike {suspension.strike_number}</Badge>
                  ) : (
                    <Badge variant="secondary">Warning</Badge>
                  )}
                </TableCell>
                <TableCell>{suspension.salary_deduction_percentage}%</TableCell>
                <TableCell>{format(new Date(suspension.suspension_end), "MMM dd, yyyy")}</TableCell>
                <TableCell>{suspension.creator?.full_name}</TableCell>
                {userRole === "super_admin" && suspension.status === "pending" && (
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleApproveSuspension(suspension.id)}>
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleRejectSuspension(suspension.id)}>
                        Reject
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default SuspensionManagement;
