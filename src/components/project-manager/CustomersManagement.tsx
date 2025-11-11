import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Building2, Phone, Mail, MapPin, Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface Customer {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  customer_address: string | null;
  project_status: string;
  notes: string | null;
  created_at: string;
  _count?: {
    tasks: number;
  };
}

interface CustomersManagementProps {
  userId: string;
}

export const CustomersManagement = ({ userId }: CustomersManagementProps) => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState({
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    customer_address: "",
    notes: "",
  });

  // Fetch customers with task counts
  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data: projects, error } = await supabase
        .from("projects")
        .select(`
          *,
          tasks(count)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return projects.map((project: any) => ({
        ...project,
        _count: {
          tasks: project.tasks?.[0]?.count || 0,
        },
      })) as Customer[];
    },
  });

  // Create customer mutation
  const createCustomer = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("projects").insert({
        ...data,
        created_by: userId,
        project_status: "active",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer created successfully");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Failed to create customer: " + error.message);
    },
  });

  // Update customer mutation
  const updateCustomer = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("projects")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer updated successfully");
      setIsDialogOpen(false);
      resetForm();
      setEditingCustomer(null);
    },
    onError: (error) => {
      toast.error("Failed to update customer: " + error.message);
    },
  });

  // Delete customer mutation
  const deleteCustomer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete customer: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      customer_name: "",
      customer_phone: "",
      customer_email: "",
      customer_address: "",
      notes: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCustomer) {
      updateCustomer.mutate({ id: editingCustomer.id, data: formData });
    } else {
      createCustomer.mutate(formData);
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      customer_name: customer.customer_name,
      customer_phone: customer.customer_phone || "",
      customer_email: customer.customer_email || "",
      customer_address: customer.customer_address || "",
      notes: customer.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string, taskCount: number) => {
    if (taskCount > 0) {
      toast.error("Cannot delete customer with existing tasks");
      return;
    }
    if (confirm("Are you sure you want to delete this customer?")) {
      deleteCustomer.mutate(id);
    }
  };

  const filteredCustomers = customers.filter((customer) =>
    customer.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.customer_phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.customer_email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Customer Directory</h2>
          <p className="text-muted-foreground">Manage all your customers in one place</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            resetForm();
            setEditingCustomer(null);
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingCustomer ? "Edit Customer" : "Add New Customer"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer_name">Customer Name *</Label>
                  <Input
                    id="customer_name"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer_phone">Phone Number</Label>
                  <Input
                    id="customer_phone"
                    value={formData.customer_phone}
                    onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer_email">Email</Label>
                <Input
                  id="customer_email"
                  type="email"
                  value={formData.customer_email}
                  onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer_address">Address</Label>
                <Textarea
                  id="customer_address"
                  value={formData.customer_address}
                  onChange={(e) => setFormData({ ...formData, customer_address: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  placeholder="Any additional information about this customer..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingCustomer ? "Update" : "Create"} Customer
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        <Label htmlFor="search">Search Customers</Label>
        <Input
          id="search"
          placeholder="Search by name, phone, or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading customers...</div>
      ) : filteredCustomers.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {searchQuery ? "No customers found matching your search" : "No customers yet. Add your first customer to get started."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCustomers.map((customer) => (
            <Card key={customer.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{customer.customer_name}</CardTitle>
                      <Badge variant="secondary" className="mt-1">
                        {customer._count?.tasks || 0} tasks
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleEdit(customer)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(customer.id, customer._count?.tasks || 0)}
                      disabled={(customer._count?.tasks || 0) > 0}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {customer.customer_phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    {customer.customer_phone}
                  </div>
                )}
                {customer.customer_email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    {customer.customer_email}
                  </div>
                )}
                {customer.customer_address && (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 mt-0.5" />
                    <span className="line-clamp-2">{customer.customer_address}</span>
                  </div>
                )}
                {customer.notes && (
                  <CardDescription className="mt-2 line-clamp-2">
                    {customer.notes}
                  </CardDescription>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
