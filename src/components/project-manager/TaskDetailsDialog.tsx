import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Send, Image, X } from "lucide-react";
import { format } from "date-fns";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigned_to: string | null;
  created_by: string;
  due_date: string | null;
  installation_address: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  created_at: string;
  assigned_profile?: {
    full_name: string;
    email: string;
  };
}

interface Message {
  id: string;
  task_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  sender_profile: {
    full_name: string;
  };
}

interface Attachment {
  id: string;
  task_id: string;
  uploaded_by: string;
  file_path: string;
  file_name: string;
  created_at: string;
  uploader_profile: {
    full_name: string;
  };
}

interface TaskDetailsDialogProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
}

export const TaskDetailsDialog = ({ task, isOpen, onClose, currentUserId }: TaskDetailsDialogProps) => {
  const [messageText, setMessageText] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: messages = [] } = useQuery({
    queryKey: ["task-messages", task?.id],
  queryFn: async () => {
    if (!task?.id) return [];
    const { data: raw, error } = await supabase
      .from("task_messages")
      .select("*")
      .eq("task_id", task.id)
      .order("created_at", { ascending: true });
    if (error) throw error;

    const messages = (raw || []) as any[];
    const senderIds = Array.from(new Set(messages.map((m) => m.sender_id).filter(Boolean)));

    if (senderIds.length === 0) {
      return messages.map((msg: any) => ({
        ...msg,
        sender_profile: { full_name: "Unknown" }
      })) as Message[];
    }

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", senderIds);
    
    console.log("Fetched profiles for task chat:", { senderIds, profiles, error: profilesError });
    
    if (profilesError) {
      console.error("Failed to fetch profiles:", profilesError);
      // Return messages with Unknown if profile fetch fails
      return messages.map((msg: any) => ({
        ...msg,
        sender_profile: { full_name: "Unknown" }
      })) as Message[];
    }

    const nameMap = new Map((profiles || []).map((p: any) => [p.id, p.full_name]));
    return messages.map((msg: any) => ({
      ...msg,
      sender_profile: { full_name: nameMap.get(msg.sender_id) || "Unknown" }
    })) as Message[];
  },
    enabled: !!task?.id,
  });

  const { data: attachments = [] } = useQuery({
    queryKey: ["task-attachments", task?.id],
  queryFn: async () => {
    if (!task?.id) return [];
    const { data: raw, error } = await supabase
      .from("task_attachments")
      .select("*")
      .eq("task_id", task.id)
      .order("created_at", { ascending: false });
    if (error) throw error;

    const attachments = (raw || []) as any[];
    const uploaderIds = Array.from(new Set(attachments.map((a) => a.uploaded_by)));
    if (uploaderIds.length === 0) return attachments as Attachment[];

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", uploaderIds);
    if (profilesError) throw profilesError;

    const nameMap = new Map((profiles || []).map((p: any) => [p.id, p.full_name]));
    return attachments.map((att: any) => ({
      ...att,
      uploader_profile: { full_name: nameMap.get(att.uploaded_by) || "Unknown" }
    })) as Attachment[];
  },
    enabled: !!task?.id,
  });

  useEffect(() => {
    if (!task?.id) return;

    const channel = supabase
      .channel(`task-messages-${task.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "task_messages",
          filter: `task_id=eq.${task.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["task-messages", task.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [task?.id, queryClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!task?.id) throw new Error("No task selected");
      const { error } = await supabase.from("task_messages").insert([{
        task_id: task.id,
        sender_id: currentUserId,
        message,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: ["task-messages", task?.id] });
    },
    onError: (error) => {
      toast.error(`Failed to send message: ${error.message}`);
    },
  });

  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!task?.id) throw new Error("No task selected");
      
      setUploadingFile(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `${currentUserId}/${task.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("task-images")
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from("task_attachments").insert([{
        task_id: task.id,
        uploaded_by: currentUserId,
        file_path: fileName,
        file_name: file.name,
      }]);
      
      if (dbError) throw dbError;
    },
    onSuccess: () => {
      toast.success("Image uploaded successfully");
      queryClient.invalidateQueries({ queryKey: ["task-attachments", task?.id] });
      setUploadingFile(false);
    },
    onError: (error) => {
      toast.error(`Failed to upload image: ${error.message}`);
      setUploadingFile(false);
    },
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: async ({ id, filePath }: { id: string; filePath: string }) => {
      const { error: storageError } = await supabase.storage
        .from("task-images")
        .remove([filePath]);
      
      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from("task_attachments")
        .delete()
        .eq("id", id);
      
      if (dbError) throw dbError;
    },
    onSuccess: () => {
      toast.success("Image deleted");
      queryClient.invalidateQueries({ queryKey: ["task-attachments", task?.id] });
    },
    onError: (error) => {
      toast.error(`Failed to delete image: ${error.message}`);
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageText.trim()) {
      sendMessageMutation.mutate(messageText);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast.error("Only image files are allowed");
        return;
      }
      uploadFileMutation.mutate(file);
    }
  };

  const getImageUrl = (filePath: string) => {
    const { data } = supabase.storage.from("task-images").getPublicUrl(filePath);
    return data.publicUrl;
  };

  if (!task) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{task.title}</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-4">
          {/* Task Details Section */}
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Task Details</h3>
              <div className="space-y-2 text-sm">
                <p><strong>Description:</strong> {task.description || "N/A"}</p>
                <p><strong>Status:</strong> {task.status}</p>
                <p><strong>Priority:</strong> {task.priority}</p>
                <p><strong>Assigned To:</strong> {task.assigned_profile?.full_name || "Unassigned"}</p>
                <p><strong>Due Date:</strong> {task.due_date ? format(new Date(task.due_date), "MMM dd, yyyy") : "N/A"}</p>
                {task.customer_name && (
                  <>
                    <p><strong>Customer:</strong> {task.customer_name}</p>
                    <p><strong>Phone:</strong> {task.customer_phone}</p>
                    <p><strong>Address:</strong> {task.installation_address}</p>
                  </>
                )}
              </div>
            </div>

            <Separator />

            {/* Attachments Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Attachments</h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFile}
                >
                  <Image className="h-4 w-4 mr-2" />
                  Upload
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
              <ScrollArea className="h-48">
                <div className="grid grid-cols-2 gap-2">
                  {attachments.map((attachment) => (
                    <div key={attachment.id} className="relative group">
                      <img
                        src={getImageUrl(attachment.file_path)}
                        alt={attachment.file_name}
                        className="w-full h-24 object-cover rounded"
                      />
                      {attachment.uploaded_by === currentUserId && (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                          onClick={() => deleteAttachmentMutation.mutate({ id: attachment.id, filePath: attachment.file_path })}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                      <p className="text-xs mt-1 truncate">{attachment.uploader_profile?.full_name || "Unknown"}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* Chat Section */}
          <div className="flex flex-col">
            <h3 className="font-semibold mb-2">Messages</h3>
            <div className="flex-1 mb-4 border rounded-lg">
              <ScrollArea className="h-96">
                <div className="p-4 pb-8">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`mb-4 flex ${msg.sender_id === currentUserId ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`max-w-[80%] ${msg.sender_id === currentUserId ? "order-2" : "order-1"}`}>
                        <div className="flex items-center gap-2 mb-1">
                          {msg.sender_id !== currentUserId && (
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {(msg.sender_profile?.full_name?.[0] ?? "?")}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {msg.sender_profile?.full_name || "Unknown"}
                          </span>
                        </div>
                        <div
                          className={`rounded-lg p-3 ${
                            msg.sender_id === currentUserId
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          <p className="text-sm">{msg.message}</p>
                          <span className="text-xs opacity-70">
                            {format(new Date(msg.created_at), "h:mm a")}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </div>
            
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                className="h-9 text-sm"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type a message..."
                disabled={sendMessageMutation.isPending}
              />
              <Button type="submit" size="icon" className="h-9 w-9" disabled={sendMessageMutation.isPending || !messageText.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};