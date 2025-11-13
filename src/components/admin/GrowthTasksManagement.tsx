import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit2, Target } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface GrowthTask {
  id: string;
  title: string;
  description: string;
  target_roles: string[];
  is_active: boolean;
  created_at: string;
}

export const GrowthTasksManagement = () => {
  const [tasks, setTasks] = useState<GrowthTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<GrowthTask | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    target_roles: [] as string[],
    is_active: true,
  });
  const { toast } = useToast();

  const roleOptions = [
    { value: "sales", label: "Sales" },
    { value: "network_manager", label: "Network Manager" },
    { value: "project_manager", label: "Project Manager" },
  ];

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from("growth_tasks")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error("Error fetching growth tasks:", error);
      toast({
        title: "Error",
        description: "Failed to load growth tasks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title || !formData.description || formData.target_roles.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields and select at least one role",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (editingTask) {
        const { error } = await supabase
          .from("growth_tasks")
          .update({
            title: formData.title,
            description: formData.description,
            target_roles: formData.target_roles,
            is_active: formData.is_active,
          })
          .eq("id", editingTask.id);

        if (error) throw error;
        toast({ title: "Growth task updated successfully" });
      } else {
        const { error } = await supabase
          .from("growth_tasks")
          .insert({
            title: formData.title,
            description: formData.description,
            target_roles: formData.target_roles,
            is_active: formData.is_active,
            created_by: user.id,
          });

        if (error) throw error;
        toast({ title: "Growth task created successfully" });
      }

      setDialogOpen(false);
      resetForm();
      fetchTasks();
    } catch (error) {
      console.error("Error saving growth task:", error);
      toast({
        title: "Error",
        description: "Failed to save growth task",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this growth task?")) return;

    try {
      const { error } = await supabase
        .from("growth_tasks")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Growth task deleted successfully" });
      fetchTasks();
    } catch (error) {
      console.error("Error deleting growth task:", error);
      toast({
        title: "Error",
        description: "Failed to delete growth task",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (task: GrowthTask) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description,
      target_roles: task.target_roles,
      is_active: task.is_active,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      target_roles: [],
      is_active: true,
    });
    setEditingTask(null);
  };

  const toggleRole = (role: string) => {
    setFormData((prev) => ({
      ...prev,
      target_roles: prev.target_roles.includes(role)
        ? prev.target_roles.filter((r) => r !== role)
        : [...prev.target_roles, role],
    }));
  };

  if (loading) {
    return <div className="text-center p-8">Loading growth tasks...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6" />
            Growth Tasks Management
          </h2>
          <p className="text-muted-foreground mt-1">
            Create and manage growth tasks for different roles
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Growth Task
        </Button>
      </div>

      <div className="grid gap-4">
        {tasks.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No growth tasks created yet. Click "Add Growth Task" to get started.
            </CardContent>
          </Card>
        ) : (
          tasks.map((task) => (
            <Card key={task.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {task.title}
                      {!task.is_active && (
                        <span className="text-xs bg-muted px-2 py-1 rounded">
                          Inactive
                        </span>
                      )}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {task.description}
                    </p>
                    <div className="flex gap-2 mt-3">
                      {task.target_roles.map((role) => (
                        <span
                          key={role}
                          className="text-xs bg-primary/10 text-primary px-2 py-1 rounded"
                        >
                          {roleOptions.find((r) => r.value === role)?.label || role}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(task)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(task.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTask ? "Edit Growth Task" : "Create Growth Task"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Task Title</Label>
              <Input
                id="title"
                placeholder="e.g., Reach out to inactive customers"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="description">Task Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what needs to be done..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={4}
              />
            </div>
            <div>
              <Label>Target Roles</Label>
              <div className="space-y-2 mt-2">
                {roleOptions.map((role) => (
                  <div key={role.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={role.value}
                      checked={formData.target_roles.includes(role.value)}
                      onCheckedChange={() => toggleRole(role.value)}
                    />
                    <label
                      htmlFor={role.value}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {role.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked as boolean })
                }
              />
              <label
                htmlFor="is_active"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Active
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingTask ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
