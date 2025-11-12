import { Shield, LayoutDashboard, Users, UserCog, Settings, UsersRound, CalendarCheck, DollarSign, FileText, Package, ClipboardList, Building2, Mail, Network } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

interface AppSidebarProps {
  userRole?: string;
}

const AppSidebar = ({ userRole }: AppSidebarProps) => {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname + location.search;

  const systemManagement = [
    { title: "System Dashboard", url: "/dashboard?tab=overview", icon: LayoutDashboard },
    { title: "All Users", url: "/dashboard?tab=users", icon: Users },
    { title: "HR Managers", url: "/dashboard?tab=managers", icon: UserCog },
    { title: "Inventory", url: "/dashboard?tab=inventory", icon: Package },
    { title: "System Settings", url: "/dashboard?tab=settings", icon: Settings },
  ];

  const hrOperations = [
    { title: "Employees", url: "/dashboard?tab=employees", icon: UsersRound },
    { title: "Attendance", url: "/dashboard?tab=attendance", icon: CalendarCheck },
    { title: "Salaries", url: "/dashboard?tab=salaries", icon: DollarSign },
    { title: "Reports", url: "/dashboard?tab=reports", icon: FileText },
  ];

  const projectManagementOperations = [
    { title: "Customers/Projects", url: "/customers", icon: Building2 },
    { title: "Tasks", url: "/dashboard?tab=tasks", icon: ClipboardList },
    { title: "Email", url: "/emails", icon: Mail },
  ];

  const networkManagerOperations = [
    { title: "Network Manager View", url: "/dashboard?tab=network-manager", icon: Network },
  ];

  const projectManagerMenu = [
    { title: "Dashboard", url: "/dashboard?tab=overview", icon: LayoutDashboard },
    { title: "Customers/Projects", url: "/customers", icon: Building2 },
    { title: "Tasks", url: "/dashboard?tab=tasks", icon: ClipboardList },
    { title: "Email", url: "/emails", icon: Mail },
  ];

  const networkManagerMenu = [
    { title: "Dashboard", url: "/dashboard?tab=overview", icon: LayoutDashboard },
    { title: "Customers", url: "/dashboard?tab=customers", icon: Users },
    { title: "Tasks", url: "/dashboard?tab=tasks", icon: ClipboardList },
    { title: "Completed Tasks", url: "/dashboard?tab=completed", icon: ClipboardList },
  ];

  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {/* Logo */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            {!isCollapsed && (
              <h1 className="text-lg font-bold text-foreground">HR System</h1>
            )}
          </div>
          {!isCollapsed && userRole === "super_admin" && (
            <span className="inline-flex items-center px-3 py-1 text-xs font-semibold bg-primary text-primary-foreground rounded">
              Super Admin
            </span>
          )}
          {!isCollapsed && userRole === "hr_manager" && (
            <span className="inline-flex items-center px-3 py-1 text-xs font-semibold bg-accent text-accent-foreground rounded">
              HR Manager
            </span>
          )}
          {!isCollapsed && userRole === "project_manager" && (
            <span className="inline-flex items-center px-3 py-1 text-xs font-semibold bg-secondary text-secondary-foreground rounded">
              Project Manager
            </span>
          )}
          {!isCollapsed && userRole === "network_manager" && (
            <span className="inline-flex items-center px-3 py-1 text-xs font-semibold bg-accent text-accent-foreground rounded">
              Network Manager
            </span>
          )}
        </div>

        {/* Navigation */}
        {userRole === "super_admin" && (
          <>
            <SidebarGroup>
              <SidebarGroupLabel>System Management</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {systemManagement.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={currentPath === item.url}>
                        <NavLink to={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>HR Operations</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {hrOperations.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={currentPath === item.url}>
                        <NavLink to={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Project Management</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {projectManagementOperations.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={currentPath === item.url}>
                        <NavLink to={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Network Management</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {networkManagerOperations.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={currentPath === item.url}>
                        <NavLink to={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        {userRole === "hr_manager" && (
          <SidebarGroup>
            <SidebarGroupLabel>HR Management</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={currentPath === "/dashboard?tab=overview"}>
                    <NavLink to="/dashboard?tab=overview">
                      <LayoutDashboard />
                      <span>Overview</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {hrOperations.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={currentPath === item.url}>
                      <NavLink to={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {userRole === "project_manager" && (
          <SidebarGroup>
            <SidebarGroupLabel>Project Management</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {projectManagerMenu.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={currentPath === item.url}>
                      <NavLink to={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {userRole === "network_manager" && (
          <SidebarGroup>
            <SidebarGroupLabel>Technical Support</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {networkManagerMenu.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={currentPath === item.url}>
                      <NavLink to={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
};

export default AppSidebar;
