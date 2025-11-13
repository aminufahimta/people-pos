import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Send, Upload, Image as ImageIcon, MessageSquare, X, MapPin, Phone, User, Calendar } from "lucide-react";
import { format } from "date-fns";

interface MyTasksDetailProps {
  taskId: string;
  currentUserId: string;
  onClose?: () => void;
}

interface Message {
  id: string;
  message: string;
  sender_id: string;
  created_at: string;
  sender?: {
    full_name: string;
  };
}

interface Attachment {
  id: string;
  file_path: string;
  file_name: string;
  created_at: string;
}

export const MyTasksDetail = ({ taskId, currentUserId, onClose }: MyTasksDetailProps) => {
  const [message, setMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Fetch task details
  const { data: task } = useQuery({
    queryKey: ["task-detail", taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          *,
          project:projects(customer_name, customer_phone, customer_address)
        `)
        .eq("id", taskId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["task-messages", taskId],
  queryFn: async () => {
    const { data: raw, error } = await supabase
      .from("task_messages")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: true });
    if (error) throw error;

    const messages = (raw || []) as any[];
    const senderIds = Array.from(new Set(messages.map((m) => m.sender_id)));
    if (senderIds.length === 0) return messages;

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", senderIds);
    
    console.log("Fetched profiles for employee task chat:", { senderIds, profiles, error: profilesError });
    
    if (profilesError) {
      console.error("Failed to fetch profiles:", profilesError);
      return messages.map((m) => ({ ...m, sender: { full_name: "Unknown" } }));
    }

    const nameMap = new Map((profiles || []).map((p: any) => [p.id, p.full_name]));
    return messages.map((m) => ({ ...m, sender: { full_name: nameMap.get(m.sender_id) || "Unknown" } }));
  },
  });

  const { data: attachments = [] } = useQuery({
    queryKey: ["task-attachments", taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_attachments")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Attachment[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`task-${taskId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "task_messages",
          filter: `task_id=eq.${taskId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["task-messages", taskId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId, queryClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessageMutation = useMutation({
    mutationFn: async (msg: string) => {
      const { error } = await supabase.from("task_messages").insert({
        task_id: taskId,
        sender_id: currentUserId,
        message: msg,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["task-messages", taskId] });
    },
    onError: (error) => {
      toast.error(`Failed to send message: ${error.message}`);
    },
  });

  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const fileExt = file.name.split(".").pop();
      const fileName = `${currentUserId}/${taskId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("task-images")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from("task_attachments").insert({
        task_id: taskId,
        uploaded_by: currentUserId,
        file_path: fileName,
        file_name: file.name,
      });

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-attachments", taskId] });
      toast.success("Image uploaded successfully");
    },
    onError: (error) => {
      toast.error(`Failed to upload image: ${error.message}`);
    },
  });

  const handleSendMessage = () => {
    if (!message.trim()) return;
    sendMessageMutation.mutate(message);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    files.forEach(file => {
      uploadImageMutation.mutate(file);
    });
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getImageUrl = (path: string) => {
    const { data } = supabase.storage.from("task-images").getPublicUrl(path);
    return data.publicUrl;
  };

  return (
    <div className="space-y-4 mt-4">
      {/* Task Information Card */}
      {task && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Task Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Title</p>
                  <p className="font-medium">{task.title}</p>
                </div>
                {task.description && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Description</p>
                    <p className="text-sm">{task.description}</p>
                  </div>
                )}
                <div className="flex gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Status</p>
                    <Badge variant="outline">{task.status}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Priority</p>
                    <Badge 
                      variant={
                        task.priority === "urgent" ? "destructive" :
                        task.priority === "high" ? "default" : "secondary"
                      }
                    >
                      {task.priority}
                    </Badge>
                  </div>
                </div>
                {task.due_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Due Date</p>
                      <p className="text-sm font-medium">
                        {format(new Date(task.due_date), "MMMM dd, yyyy")}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <Separator className="md:hidden" />

                {/* Customer Information */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Customer Information</h4>
                  {(task.customer_name || (task as any).project?.customer_name) && (
                    <div className="flex items-start gap-2">
                      <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Customer Name</p>
                        <p className="text-sm font-medium">{task.customer_name || (task as any).project?.customer_name}</p>
                      </div>
                    </div>
                  )}
                  {(task.customer_phone || (task as any).project?.customer_phone) && (
                    <div className="flex items-start gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Phone Number</p>
                        <p className="text-sm font-medium">{task.customer_phone || (task as any).project?.customer_phone}</p>
                      </div>
                    </div>
                  )}
                  {(task.installation_address || (task as any).project?.customer_address) && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Installation Address</p>
                        <p className="text-sm font-medium">{task.installation_address || (task as any).project?.customer_address}</p>
                      </div>
                    </div>
                  )}
                </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chat and Attachments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Chat Section */}
        <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Messages
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close chat">
              <X className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] mb-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`mb-4 ${
                  msg.sender_id === currentUserId ? "text-right" : "text-left"
                }`}
              >
                <div
                  className={`inline-block max-w-[80%] p-3 rounded-lg ${
                    msg.sender_id === currentUserId
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm font-medium mb-1">
                    {msg.sender?.full_name || "Unknown"}
                  </p>
                  <p>{msg.message}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {format(new Date(msg.created_at), "MMM dd, HH:mm")}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </ScrollArea>

          <div className="flex gap-2">
            <Input
              className="h-9 text-sm"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            />
            <Button onClick={handleSendMessage} size="icon" className="h-9 w-9">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Attachments Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Images
          </CardTitle>
          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadImageMutation.isPending}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="grid grid-cols-2 gap-4">
              {attachments.map((attachment) => (
                <Card 
                  key={attachment.id} 
                  className="p-2 cursor-pointer hover:shadow-md transition-shadow active:scale-95" 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedImage(getImageUrl(attachment.file_path));
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedImage(getImageUrl(attachment.file_path));
                  }}
                >
                  <img
                    src={getImageUrl(attachment.file_path)}
                    alt={attachment.file_name}
                    className="w-full h-32 object-cover rounded mb-2 pointer-events-none"
                  />
                  <p className="text-xs truncate">{attachment.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(attachment.created_at), "MMM dd, yyyy")}
                  </p>
                </Card>
              ))}
              {attachments.length === 0 && (
                <div className="col-span-2 text-center text-muted-foreground py-8">
                  <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No images uploaded yet</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
      </div>

      {/* Image Preview Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl p-2 sm:p-6">
          {selectedImage && (
            <img
              src={selectedImage}
              alt="Full size preview"
              className="w-full h-auto max-h-[85vh] object-contain rounded"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};