import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Sun, Moon } from "lucide-react";
import { toast } from "sonner";
import AppSidebar from "@/components/layout/AppSidebar";

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  userRole?: string;
}

const DashboardLayout = ({ children, title, subtitle, userRole }: DashboardLayoutProps) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/auth");
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar userRole={userRole} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="border-b border-border bg-card/80 backdrop-blur-sm px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-foreground">{title}</h1>
                {userRole === "super_admin" && (
                  <Badge className="bg-primary text-primary-foreground">
                    SUPER ADMIN ACCESS
                  </Badge>
                )}
              </div>
              {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon">
                <Sun className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
