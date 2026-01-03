import { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import useAuthState from "@/hooks/use-auth-state";

export type TaskStatus = "pending" | "completed";

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  created_at: string;
}

const Index = () => {
  const { user, loading } = useAuthState();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("pending");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TaskStatus>("all");

  if (!loading && !user) {
    navigate("/auth", { replace: true });
  }

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, description, status, created_at")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return data as Task[];
    },
    enabled: !!user,
  });

  const createTask = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tasks").insert({
        title,
        description: description || null,
        status,
        user_id: user?.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setTitle("");
      setDescription("");
      setStatus("pending");
      toast({ title: "Task created" });
    },
    onError: (error: unknown) => {
      toast({
        title: "Error creating task",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const updateTask = useMutation({
    mutationFn: async (task: Partial<Task> & { id: string }) => {
      const { error } = await supabase
        .from("tasks")
        .update({
          title: task.title,
          description: task.description,
          status: task.status,
        })
        .eq("id", task.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({ title: "Task updated" });
    },
    onError: (error: unknown) => {
      toast({
        title: "Error updating task",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({ title: "Task deleted" });
    },
    onError: (error: unknown) => {
      toast({
        title: "Error deleting task",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch =
        search.trim().length === 0 ||
        task.title.toLowerCase().includes(search.toLowerCase()) ||
        (task.description ?? "").toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter === "all" || task.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [tasks, search, statusFilter]);

  const handleToggleStatus = (task: Task) => {
    updateTask.mutate({
      id: task.id,
      status: task.status === "pending" ? "completed" : "pending",
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/60 backdrop-blur">
        <div className="container flex items-center justify-between py-4">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">Task Dashboard</h1>
            <p className="text-sm text-muted-foreground">Manage your tasks and track your progress.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/profile" className="hover-scale">
                Profile
              </Link>
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container space-y-6 py-6">
        <section className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-start">
          <Card className="animate-enter">
            <CardHeader>
              <CardTitle>Add Task</CardTitle>
              <CardDescription>Create a new task with a status.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="task-title">
                  Title
                </label>
                <Input
                  id="task-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Write report, review PRs..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="task-description">
                  Description
                </label>
                <Textarea
                  id="task-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional details for this task"
                  rows={3}
                />
              </div>
              <div className="flex items-center gap-4">
                <div className="space-y-1">
                  <span className="text-sm font-medium">Status</span>
                  <Select value={status} onValueChange={(value) => setStatus(value as TaskStatus)}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="ml-auto hover-scale"
                  onClick={() => createTask.mutate()}
                  disabled={createTask.isPending || !title.trim()}
                >
                  {createTask.isPending ? "Creating..." : "Add Task"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="space-y-4 animate-enter">
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle>Your Tasks</CardTitle>
                  <CardDescription>Search and filter your task list.</CardDescription>
                </div>
              </div>
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <Input
                  placeholder="Search by title or description"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="md:max-w-sm"
                />
                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value as "all" | TaskStatus)}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading tasks...</p>
              ) : filteredTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tasks match your criteria yet.</p>
              ) : (
                <ul className="space-y-3">
                  {filteredTasks.map((task) => (
                    <li
                      key={task.id}
                      className="flex items-start justify-between gap-3 rounded-md border bg-card/60 p-3 transition-all hover-scale animate-fade-in"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{task.title}</span>
                          <Badge variant={task.status === "completed" ? "default" : "secondary"}>
                            {task.status === "completed" ? "Completed" : "Pending"}
                          </Badge>
                        </div>
                        {task.description && (
                          <p className="text-sm text-muted-foreground">{task.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Created {new Date(task.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleStatus(task)}
                          className="w-28"
                        >
                          {task.status === "pending" ? "Mark done" : "Mark pending"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteTask.mutate(task.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
};

export default Index;
