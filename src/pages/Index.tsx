import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useToast } from "@/hooks/use-toast";
import useAuthState from "@/hooks/use-auth-state";
import ThemeToggle from "@/components/ThemeToggle";

export type TaskStatus = "pending" | "completed";

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  created_at: string;
}

interface PaginationControlsProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}

const PaginationControls = ({ page, pageCount, onPageChange }: PaginationControlsProps) => {
  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage > pageCount || nextPage === page) return;
    onPageChange(nextPage);
  };

  const items: (number | "ellipsis")[] = [];

  for (let i = 1; i <= pageCount; i++) {
    if (i === 1 || i === pageCount || Math.abs(i - page) <= 1) {
      items.push(i);
    } else if (items[items.length - 1] !== "ellipsis") {
      items.push("ellipsis");
    }
  }

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={(e) => {
              e.preventDefault();
              handlePageChange(page - 1);
            }}
            aria-disabled={page === 1}
          />
        </PaginationItem>
        {items.map((item, index) => (
          <PaginationItem key={index}>
            {item === "ellipsis" ? (
              <PaginationEllipsis />
            ) : (
              <PaginationLink
                href="#"
                isActive={item === page}
                onClick={(e) => {
                  e.preventDefault();
                  handlePageChange(item);
                }}
              >
                {item}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={(e) => {
              e.preventDefault();
              handlePageChange(page + 1);
            }}
            aria-disabled={page === pageCount}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
};

const Index = () => {
  const { user, loading } = useAuthState();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("pending");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TaskStatus>("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const {
    data: tasksData,
    isLoading,
    error: tasksError,
  } = useQuery<{ data: Task[]; count: number | null } | null>({
    queryKey: [
      "tasks",
      {
        page,
        pageSize,
        statusFilter,
        search,
      },
    ],
    queryFn: async () => {
      let query = supabase
        .from("tasks")
        .select("id, title, description, status, created_at", { count: "exact" })
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (search.trim()) {
        const searchValue = `%${search.trim()}%`;
        query = query.or(
          `title.ilike.${searchValue},description.ilike.${searchValue}`,
        );
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, count, error } = await query.range(from, to);

      if (error) {
        throw error;
      }

      return { data: (data as Task[]) ?? [], count: count ?? 0 };
    },
    enabled: !!user,
  });

  const tasks = tasksData?.data ?? [];
  const totalCount = tasksData?.count ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));

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
    return tasks;
  }, [tasks]);

  const handleToggleStatus = (task: Task) => {
    updateTask.mutate({
      id: task.id,
      status: task.status === "pending" ? "completed" : "pending",
    });
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Signed out",
      description: "You have been logged out.",
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="space-y-3 text-center">
          <div className="mx-auto h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!loading && !user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/60 backdrop-blur">
        <div className="container flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">Task Dashboard</h1>
            <p className="text-sm text-muted-foreground">Manage your tasks and track your progress.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:justify-end">
            <ThemeToggle />
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
            <CardHeader className="space-y-1 p-4 md:p-6">
              <CardTitle className="text-base font-semibold md:text-lg">Add Task</CardTitle>
              <CardDescription className="text-xs md:text-sm">Create a new task with a status.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0 md:space-y-4 md:p-6 md:pt-0">
              <div className="space-y-1 md:space-y-2">
                <label className="text-xs font-medium md:text-sm" htmlFor="task-title">
                  Title
                </label>
                <Input
                  id="task-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Write report, review PRs..."
                />
              </div>
              <div className="space-y-1 md:space-y-2">
                <label className="text-xs font-medium md:text-sm" htmlFor="task-description">
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
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-medium md:text-sm">Status</span>
                  <Select value={status} onValueChange={(value) => setStatus(value as TaskStatus)}>
                    <SelectTrigger className="w-full sm:w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="ml-auto w-full hover-scale sm:w-auto"
                  onClick={() => createTask.mutate()}
                  disabled={createTask.isPending || !title.trim()}
                >
                  {createTask.isPending ? "Creating..." : "Add Task"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="space-y-3 animate-enter">
            <CardHeader className="space-y-2 p-4 md:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base font-semibold md:text-lg">Your Tasks</CardTitle>
                  <CardDescription className="text-xs md:text-sm">
                    Search and filter your task list.
                  </CardDescription>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                  placeholder="Search by title or description"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="w-full md:max-w-sm"
                />
                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value as "all" | TaskStatus);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-[160px]">
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
            <CardContent className="space-y-3 p-4 pt-0 md:space-y-4 md:p-6 md:pt-0">
              {isLoading ? (
                <div className="space-y-3">
                  <div className="h-4 w-1/3 rounded-md bg-muted animate-pulse" />
                  <div className="h-4 w-2/3 rounded-md bg-muted/80 animate-pulse" />
                  <div className="h-4 w-1/2 rounded-md bg-muted/60 animate-pulse" />
                </div>
              ) : tasksError ? (
                <div className="flex flex-col gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                  <p>There was a problem loading your tasks.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="self-start"
                    onClick={() => queryClient.invalidateQueries({ queryKey: ["tasks"] })}
                  >
                    Try again
                  </Button>
                </div>
              ) : filteredTasks.length === 0 ? (
                search.trim() || statusFilter !== "all" ? (
                  <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-2 rounded-md border border-dashed bg-muted/40 p-5 text-center md:p-6">
                    <p className="text-sm font-medium md:text-base">No tasks match your filters</p>
                    <p className="text-xs text-muted-foreground md:text-sm">
                      Try adjusting your search or status filter.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearch("");
                        setStatusFilter("all");
                        setPage(1);
                      }}
                    >
                      Clear filters
                    </Button>
                  </div>
                ) : (
                  <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-2 rounded-md border border-dashed bg-muted/40 p-5 text-center md:p-6">
                    <p className="text-sm font-medium md:text-base">No tasks yet</p>
                    <p className="text-xs text-muted-foreground md:text-sm">
                      Create your first task to get started.
                    </p>
                  </div>
                )
              ) : (
                <>
                  <ul className="space-y-2 md:space-y-3">
                    {filteredTasks.map((task, index) => (
                      <li
                        key={task.id}
                        className="flex items-start justify-between gap-2 rounded-md border bg-card/60 p-3 text-xs md:gap-3 md:p-4 md:text-sm transition-all hover-scale animate-fade-in"
                        style={{ animationDelay: `${index * 40}ms` }}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="max-w-[160px] truncate font-medium sm:max-w-xs md:max-w-sm">
                              {task.title}
                            </span>
                            <Badge
                              className="text-[10px] md:text-xs"
                              variant={task.status === "completed" ? "default" : "secondary"}
                            >
                              {task.status === "completed" ? "Completed" : "Pending"}
                            </Badge>
                          </div>
                          {task.description && (
                            <p className="line-clamp-2 text-[11px] text-muted-foreground md:text-xs">
                              {task.description}
                            </p>
                          )}
                          <p className="text-[10px] text-muted-foreground md:text-xs">
                            Created {new Date(task.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 md:gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleStatus(task)}
                            className="w-24 text-xs md:w-28 md:text-sm"
                          >
                            {task.status === "pending" ? "Mark done" : "Mark pending"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-[11px] text-destructive hover:text-destructive md:text-xs"
                            onClick={() => deleteTask.mutate(task.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>

                  {pageCount > 1 && (
                    <div className="border-t pt-3 md:pt-4">
                      <PaginationControls
                        page={page}
                        pageCount={pageCount}
                        onPageChange={setPage}
                      />
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
};

export default Index;
