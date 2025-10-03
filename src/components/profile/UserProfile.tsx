import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { UserCircle } from "lucide-react";

interface UserProfileProps {
  user: User;
  userRole: string;
}

const UserProfile = ({ user, userRole }: UserProfileProps) => {
  const [profile, setProfile] = useState<any>(null);
  const [salaryInfo, setSalaryInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editForm, setEditForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    department: "",
    position: "",
  });

  useEffect(() => {
    fetchProfile();
  }, [user.id]);

  const fetchProfile = async () => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);
      setEditForm({
        full_name: profileData.full_name,
        email: profileData.email,
        phone: profileData.phone || "",
        department: profileData.department || "",
        position: profileData.position || "",
      });

      const { data: salaryData } = await supabase
        .from("salary_info")
        .select("*")
        .eq("user_id", user.id)
        .single();

      setSalaryInfo(salaryData);
    } catch (error: any) {
      console.error("Failed to load profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editForm.full_name,
          phone: editForm.phone || null,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Profile updated successfully");
      fetchProfile();
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "super_admin":
        return <Badge className="bg-primary">Super Admin</Badge>;
      case "hr_manager":
        return <Badge className="bg-accent">HR Manager</Badge>;
      case "employee":
        return <Badge variant="secondary">Employee</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const canEdit = userRole === "super_admin";

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <UserCircle className="h-4 w-4" />
          My Profile
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>My Profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  {canEdit ? (
                    <Input
                      value={editForm.full_name}
                      onChange={(e) =>
                        setEditForm({ ...editForm, full_name: e.target.value })
                      }
                    />
                  ) : (
                    <p className="text-sm font-medium">{profile?.full_name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <p className="text-sm font-medium">{profile?.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone</Label>
                  {canEdit ? (
                    <Input
                      value={editForm.phone}
                      onChange={(e) =>
                        setEditForm({ ...editForm, phone: e.target.value })
                      }
                    />
                  ) : (
                    <p className="text-sm font-medium">{profile?.phone || "-"}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <div>{getRoleBadge(userRole)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Department</Label>
                  <p className="text-sm font-medium">{profile?.department || "-"}</p>
                </div>
                <div className="space-y-2">
                  <Label>Position</Label>
                  <p className="text-sm font-medium">{profile?.position || "-"}</p>
                </div>
              </div>

              {canEdit && (
                <Button onClick={handleUpdate} className="w-full">
                  Update Profile
                </Button>
              )}
            </CardContent>
          </Card>

          {salaryInfo && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Salary Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Base Salary</Label>
                    <p className="text-sm font-medium">
                      ₦{Number(salaryInfo.base_salary).toLocaleString()}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Daily Rate</Label>
                    <p className="text-sm font-medium">
                      ₦{Number(salaryInfo.daily_rate).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Total Deductions</Label>
                    <p className="text-sm font-medium text-destructive">
                      ₦{Number(salaryInfo.total_deductions).toLocaleString()}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Current Salary</Label>
                    <p className="text-sm font-medium text-success">
                      ₦{Number(salaryInfo.current_salary).toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserProfile;
