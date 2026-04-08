"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { TaskList } from "@/components/tasks/task-list";
import { AddTaskModal } from "@/components/tasks/add-task-modal";

export function BottomSheet() {
  const [addTaskOpen, setAddTaskOpen] = useState(false);

  return (
    <>
      <Sheet>
        <SheetTrigger className="w-full py-3 text-sm text-gray-400 border-t border-gray-100 hover:bg-gray-50 transition-colors">
          Tasks · Routine · Horizons
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl">
          <SheetHeader className="pb-2">
            <div className="flex items-center justify-between">
              <SheetTitle>Manage</SheetTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAddTaskOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1" /> Task
              </Button>
            </div>
          </SheetHeader>
          <Tabs defaultValue="tasks" className="flex-1">
            <TabsList className="w-full">
              <TabsTrigger value="tasks" className="flex-1">
                Tasks
              </TabsTrigger>
              <TabsTrigger value="routine" className="flex-1">
                Routine
              </TabsTrigger>
              <TabsTrigger value="horizons" className="flex-1">
                Horizons
              </TabsTrigger>
            </TabsList>
            <TabsContent value="tasks" className="mt-4 overflow-y-auto max-h-[50vh]">
              <TaskList />
            </TabsContent>
            <TabsContent value="routine" className="mt-4 overflow-y-auto max-h-[50vh]">
              <p className="text-sm text-gray-400 text-center py-8">
                Edit your weekly routine in Settings.
              </p>
            </TabsContent>
            <TabsContent value="horizons" className="mt-4 overflow-y-auto max-h-[50vh]">
              <p className="text-sm text-gray-400 text-center py-8">
                Adjust time allocations in Settings.
              </p>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
      <AddTaskModal
        open={addTaskOpen}
        onClose={() => setAddTaskOpen(false)}
      />
    </>
  );
}
