import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import SuperAdminDashboard from "@/components/dashboard/SuperAdminDashboard";
import HRManagerDashboard from "@/components/dashboard/HRManagerDashboard";
import EmployeeDashboard from "@/components/dashboard/EmployeeDashboard";
import { Loader2, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isApproved, setIsApproved] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setUser(session.user);

      // Check user profile for approval status
      const { data: profileData } = await supabase
        .from("profiles")
        .select("is_approved")
        .eq("id", session.user.id)
        .single();

      if (profileData) {
        setIsApproved(profileData.is_approved ?? true);
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .single();

      if (roleData) {
        setRole(roleData.role);
      }
      
      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_OUT") {
          navigate("/auth");
        } else if (session) {
          setUser(session.user);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !role) {
    return null;
  }

  // Check if user is awaiting approval
  if (!isApproved) {
    const handleSignOut = async () => {
      await supabase.auth.signOut();
      navigate("/auth");
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Clock className="h-16 w-16 text-warning" />
            </div>
            <CardTitle className="text-2xl">Account Pending Approval</CardTitle>
            <CardDescription>
              Your account is currently under review by our HR team.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Thank you for submitting your documents. Our team will verify your information
              and approve your account shortly. You will receive an email notification once
              your account is approved.
            </p>
            <Button onClick={handleSignOut} className="w-full" variant="outline">
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  switch (role) {
    case "super_admin":
      return <SuperAdminDashboard user={user} />;
    case "hr_manager":
      return <HRManagerDashboard user={user} />;
    case "employee":
      return <EmployeeDashboard user={user} />;
    default:
      return null;
  }
};

export default Dashboard;
