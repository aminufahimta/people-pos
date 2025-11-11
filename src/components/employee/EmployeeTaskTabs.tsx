import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MyTasks } from "./MyTasks";
import { CompletedTasks } from "@/components/project-manager/CompletedTasks";
import { ClipboardList, CheckCircle2 } from "lucide-react";

interface EmployeeTaskTabsProps {
  userId: string;
}

export const EmployeeTaskTabs = ({ userId }: EmployeeTaskTabsProps) => {
  return (
    <Tabs defaultValue="active" className="w-full">
      <TabsList className="grid w-full max-w-md grid-cols-2">
        <TabsTrigger value="active" className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          My Tasks
        </TabsTrigger>
        <TabsTrigger value="completed" className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          Completed
        </TabsTrigger>
      </TabsList>

      <TabsContent value="active" className="space-y-4">
        <MyTasks userId={userId} />
      </TabsContent>

      <TabsContent value="completed" className="space-y-4">
        <CompletedTasks userId={userId} userRole="employee" />
      </TabsContent>
    </Tabs>
  );
};
