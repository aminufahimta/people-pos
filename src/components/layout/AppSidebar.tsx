import { Shield, LayoutDashboard, Users, UserCog, Settings, UsersRound, CalendarCheck, DollarSign, FileText } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  userRole?: string;
}

const AppSidebar = ({ userRole }: AppSidebarProps) => {
  const systemManagement = [
    { title: "System Dashboard", url: "/dashboard?tab=overview", icon: LayoutDashboard },
    { title: "All Users", url: "/dashboard?tab=users", icon: Users },
    { title: "HR Managers", url: "/dashboard?tab=managers", icon: UserCog },
    { title: "System Settings", url: "/dashboard?tab=settings", icon: Settings },
  ];

  const hrOperations = [
    { title: "Employees", url: "/dashboard?tab=employees", icon: UsersRound },
    { title: "Attendance", url: "/dashboard?tab=attendance", icon: CalendarCheck },
    { title: "Salaries", url: "/dashboard?tab=salaries", icon: DollarSign },
    { title: "Reports", url: "/dashboard?tab=reports", icon: FileText },
  ];

  return (
    <div className="w-64 h-screen bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">HR System</h1>
          </div>
        </div>
        {userRole === "super_admin" && (
          <span className="inline-flex items-center px-3 py-1 text-xs font-semibold bg-primary text-primary-foreground rounded">
            Super Admin
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        {userRole === "super_admin" && (
          <>
            <div className="mb-6">
              <h2 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                System Management
              </h2>
              <div className="space-y-1">
                {systemManagement.map((item) => (
                  <NavLink
                    key={item.title}
                    to={item.url}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors",
                      "text-sidebar-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </NavLink>
                ))}
              </div>
            </div>

            <div>
              <h2 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                HR Operations
              </h2>
              <div className="space-y-1">
                {hrOperations.map((item) => (
                  <NavLink
                    key={item.title}
                    to={item.url}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors",
                      "text-sidebar-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          </>
        )}
      </nav>
    </div>
  );
};

export default AppSidebar;
