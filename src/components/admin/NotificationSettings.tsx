import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Bell, BellOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface NotificationSetting {
  id: string;
  role: string;
  notification_type: string;
  enabled: boolean;
  description: string | null;
}

export function NotificationSettings() {
  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("notification_settings")
        .select("*")
        .order("role", { ascending: true })
        .order("notification_type", { ascending: true });

      if (error) throw error;
      setSettings(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load notification settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleNotification = async (id: string, currentEnabled: boolean) => {
    try {
      const { error } = await supabase
        .from("notification_settings")
        .update({ enabled: !currentEnabled })
        .eq("id", id);

      if (error) throw error;

      setSettings(settings.map(setting => 
        setting.id === id ? { ...setting, enabled: !currentEnabled } : setting
      ));

      toast({
        title: "Success",
        description: "Notification setting updated",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update notification setting",
        variant: "destructive",
      });
    }
  };

  const getRoleName = (role: string) => {
    const roleMap: Record<string, string> = {
      super_admin: "Super Admin",
      hr_manager: "HR Manager",
      project_manager: "Project Manager",
      employee: "Employee",
    };
    return roleMap[role] || role;
  };

  const formatNotificationType = (type: string) => {
    return type
      .split("_")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const getRoleBadgeColor = (role: string) => {
    const colorMap: Record<string, string> = {
      super_admin: "bg-red-500 hover:bg-red-600",
      hr_manager: "bg-blue-500 hover:bg-blue-600",
      project_manager: "bg-purple-500 hover:bg-purple-600",
      employee: "bg-green-500 hover:bg-green-600",
    };
    return colorMap[role] || "bg-gray-500 hover:bg-gray-600";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const groupedSettings = settings.reduce((acc, setting) => {
    if (!acc[setting.role]) {
      acc[setting.role] = [];
    }
    acc[setting.role].push(setting);
    return acc;
  }, {} as Record<string, NotificationSetting[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Bell className="h-5 w-5" />
        <h2 className="text-2xl font-bold">Notification Settings</h2>
      </div>
      <p className="text-muted-foreground">
        Control which notifications each user role receives
      </p>

      {Object.entries(groupedSettings).map(([role, roleSettings]) => (
        <Card key={role}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Badge className={getRoleBadgeColor(role)}>
                {getRoleName(role)}
              </Badge>
              <CardTitle className="text-lg">{getRoleName(role)} Notifications</CardTitle>
            </div>
            <CardDescription>
              Manage notification preferences for {getRoleName(role).toLowerCase()}s
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {roleSettings.map((setting) => (
              <div
                key={setting.id}
                className="flex items-center justify-between gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  {setting.enabled ? (
                    <Bell className="h-4 w-4 text-primary shrink-0" />
                  ) : (
                    <BellOff className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <Label htmlFor={setting.id} className="text-sm font-medium cursor-pointer">
                      {formatNotificationType(setting.notification_type)}
                    </Label>
                    {setting.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {setting.description}
                      </p>
                    )}
                  </div>
                </div>
                <Switch
                  id={setting.id}
                  checked={setting.enabled}
                  onCheckedChange={() => toggleNotification(setting.id, setting.enabled)}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
