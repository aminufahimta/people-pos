import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Pencil, Trash2, UserPlus } from "lucide-react";

interface HRManagerManagementProps {
  onUpdate?: () => void;
}

const HRManagerManagement = ({ onUpdate }: HRManagerManagementProps) => {
  const [managers, setManagers] = useState<any[]>([]);
  const [editingManager, setEditingManager] = useState<any>(null);
  const [isCreatingManager, setIsCreatingManager] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: "",
    email: "",
    department: "",
    position: "",
    phone: "",
  });
  const [newManagerForm, setNewManagerForm] = useState({
    email: "",
    password: "",
    full_name: "",
    department: "",
    position: "",
    phone: "",
  });

  useEffect(() => {
    fetchManagers();
  }, []);

  const fetchManagers = async () => {
    const { data: profiles } = await supabase
      .from("profiles")
      .select(`
        *,
        user_roles!inner (role)
      `)
      .eq("user_roles.role", "hr_manager")
      .order("full_name");

    setManagers(profiles || []);
  };

  const handleUpdateManager = async () => {
    if (!editingManager) return;

    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: editForm.full_name,
          email: editForm.email,
          department: editForm.department || null,
          position: editForm.position || null,
          phone: editForm.phone || null,
        })
        .eq("id", editingManager.id);

      if (profileError) throw profileError;

      toast.success("HR Manager updated successfully");
      setEditingManager(null);
      fetchManagers();
      onUpdate?.();
    } catch (error: any) {
      toast.error(error.message || "Failed to update HR Manager");
    }
  };

  const handleCreateManager = async () => {
    if (!newManagerForm.email || !newManagerForm.password || !newManagerForm.full_name) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsCreatingManager(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const payload: any = {
        email: newManagerForm.email,
        password: newManagerForm.password,
        full_name: newManagerForm.full_name,
        role: 'hr_manager',
      };
      if (newManagerForm.department.trim()) payload.department = newManagerForm.department;
      if (newManagerForm.position.trim()) payload.position = newManagerForm.position;
      if (newManagerForm.phone.trim()) payload.phone = newManagerForm.phone;

      const { data, error } = await supabase.functions.invoke('create-user', {
        body: payload,
      });

      if (error) {
        const serverMessage = (data as any)?.error || (data as any)?.details || error.message
        console.error('create-user error:', { error, data })
        throw new Error(serverMessage || "Failed to create HR Manager")
      }

      toast.success("HR Manager created successfully");
      setNewManagerForm({
        email: "",
        password: "",
        full_name: "",
        department: "",
        position: "",
        phone: "",
      });
      fetchManagers();
      onUpdate?.();
    } catch (error: any) {
      toast.error(error.message || "Failed to create HR Manager");
    } finally {
      setIsCreatingManager(false);
    }
  };

  const handleDeleteManager = async (managerId: string) => {
    if (!confirm("Are you sure you want to delete this HR Manager?")) return;

    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId: managerId },
      });

      if (error) throw new Error(error.message || "Failed to delete HR Manager");

      toast.success("HR Manager deleted successfully");
      fetchManagers();
      onUpdate?.();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete HR Manager");
    }
  };

  return (
    <Card className="shadow-[var(--shadow-elegant)]">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>HR Manager Management</CardTitle>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Add HR Manager
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New HR Manager</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new_full_name">Full Name *</Label>
                <Input
                  id="new_full_name"
                  value={newManagerForm.full_name}
                  onChange={(e) =>
                    setNewManagerForm({ ...newManagerForm, full_name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new_email">Email *</Label>
                <Input
                  id="new_email"
                  type="email"
                  value={newManagerForm.email}
                  onChange={(e) =>
                    setNewManagerForm({ ...newManagerForm, email: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new_password">Password *</Label>
                <Input
                  id="new_password"
                  type="password"
                  value={newManagerForm.password}
                  onChange={(e) =>
                    setNewManagerForm({ ...newManagerForm, password: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new_department">Department</Label>
                <Input
                  id="new_department"
                  value={newManagerForm.department}
                  onChange={(e) =>
                    setNewManagerForm({ ...newManagerForm, department: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new_position">Position</Label>
                <Input
                  id="new_position"
                  value={newManagerForm.position}
                  onChange={(e) =>
                    setNewManagerForm({ ...newManagerForm, position: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new_phone">Phone</Label>
                <Input
                  id="new_phone"
                  type="tel"
                  value={newManagerForm.phone}
                  onChange={(e) =>
                    setNewManagerForm({ ...newManagerForm, phone: e.target.value })
                  }
                />
              </div>
              <Button
                onClick={handleCreateManager}
                disabled={isCreatingManager}
                className="w-full"
              >
                {isCreatingManager ? "Creating..." : "Create HR Manager"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {managers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No HR Managers found. Create one to get started.
                </TableCell>
              </TableRow>
            ) : (
              managers.map((manager) => (
                <TableRow key={manager.id}>
                  <TableCell className="font-medium">{manager.full_name}</TableCell>
                  <TableCell>{manager.email}</TableCell>
                  <TableCell>{manager.department || "-"}</TableCell>
                  <TableCell>{manager.position || "-"}</TableCell>
                  <TableCell>{manager.phone || "-"}</TableCell>
                  <TableCell>
                    <Badge className="bg-accent">HR Manager</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingManager(manager);
                              setEditForm({
                                full_name: manager.full_name,
                                email: manager.email,
                                department: manager.department || "",
                                position: manager.position || "",
                                phone: manager.phone || "",
                              });
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Edit HR Manager - {manager.full_name}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="edit_full_name">Full Name</Label>
                              <Input
                                id="edit_full_name"
                                value={editForm.full_name}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, full_name: e.target.value })
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="edit_email">Email</Label>
                              <Input
                                id="edit_email"
                                type="email"
                                value={editForm.email}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, email: e.target.value })
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="edit_department">Department</Label>
                              <Input
                                id="edit_department"
                                value={editForm.department}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, department: e.target.value })
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="edit_position">Position</Label>
                              <Input
                                id="edit_position"
                                value={editForm.position}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, position: e.target.value })
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="edit_phone">Phone</Label>
                              <Input
                                id="edit_phone"
                                type="tel"
                                value={editForm.phone}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, phone: e.target.value })
                                }
                              />
                            </div>
                            <Button onClick={handleUpdateManager} className="w-full">
                              Update HR Manager
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteManager(manager.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default HRManagerManagement;
