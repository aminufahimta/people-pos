import { ReactNode, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Sun, Moon, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import AppSidebar from "@/components/layout/AppSidebar";
import UserProfile from "@/components/profile/UserProfile";
import NotificationDropdown from "@/components/dashboard/NotificationDropdown";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  userRole?: string;
}

const DashboardLayout = ({ children, title, subtitle, userRole }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/auth");
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar userRole={userRole} />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="border-b border-border bg-card/80 backdrop-blur-sm px-4 md:px-8 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 md:gap-4 min-w-0">
                <SidebarTrigger className="md:hidden" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 md:gap-3 mb-1 flex-wrap">
                    <h1 className="text-lg md:text-2xl font-bold text-foreground truncate">{title}</h1>
                    {userRole === "super_admin" && (
                      <Badge className="bg-primary text-primary-foreground text-xs hidden sm:inline-flex">
                        SUPER ADMIN
                      </Badge>
                    )}
                  </div>
                  {subtitle && <p className="text-xs md:text-sm text-muted-foreground truncate">{subtitle}</p>}
                </div>
              </div>
              <div className="flex items-center gap-1 md:gap-2 shrink-0">
                <NotificationDropdown userId={user?.id} />
                {user && userRole && <UserProfile user={user} userRole={userRole} />}
                <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-9 w-9 md:h-10 md:w-10">
                  {theme === "dark" ? (
                    <Sun className="h-4 w-4 md:h-5 md:w-5" />
                  ) : (
                    <Moon className="h-4 w-4 md:h-5 md:w-5" />
                  )}
                </Button>
                <Button variant="outline" onClick={handleLogout} className="gap-2 h-9 md:h-10 px-2 md:px-4">
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </div>
            </div>
          </header>
          
          <main className="flex-1 overflow-y-auto p-4 md:p-8">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
