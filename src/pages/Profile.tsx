import { useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import useAuthState from "@/hooks/use-auth-state";

interface TaskCountRow {
  status: "pending" | "completed";
  count: number;
}

const ProfilePage = () => {
  const { user, loading } = useAuthState();

  const { data: counts = [], isLoading } = useQuery<TaskCountRow[]>({
    queryKey: ["task-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("status, id");

      if (error) {
        throw error;
      }

      const rows = (data ?? []) as { status: "pending" | "completed"; id: string }[];
      const summary: Record<string, number> = {};

      for (const row of rows) {
        summary[row.status] = (summary[row.status] ?? 0) + 1;
      }

      return Object.entries(summary).map(([status, count]) => ({ status: status as "pending" | "completed", count }));
    },
    enabled: !!user,
  });

  const totalTasks = useMemo(
    () => counts.reduce((sum, row) => sum + row.count, 0),
    [counts],
  );

  const completedTasks = useMemo(
    () => counts.find((row) => row.status === "completed")?.count ?? 0,
    [counts],
  );

  const pendingTasks = useMemo(
    () => counts.find((row) => row.status === "pending")?.count ?? 0,
    [counts],
  );

  if (!loading && !user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/60 backdrop-blur">
        <div className="container flex items-center justify-between py-4">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">Profile</h1>
            <p className="text-sm text-muted-foreground">Overview of your task activity.</p>
          </div>
          <Button variant="ghost" asChild>
            <Link to="/" className="hover-scale">
              Back to dashboard
            </Link>
          </Button>
        </div>
      </header>

      <main className="container space-y-6 py-6">
        <section className="grid gap-4 md:grid-cols-3 animate-enter">
          <Card>
            <CardHeader>
              <CardTitle>Total Tasks</CardTitle>
              <CardDescription>All tasks you have created.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-baseline justify-between">
              <span className="text-3xl font-semibold">{isLoading ? "-" : totalTasks}</span>
              <Badge variant="secondary">Total</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Completed</CardTitle>
              <CardDescription>Tasks you have finished.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-baseline justify-between">
              <span className="text-3xl font-semibold text-primary">{isLoading ? "-" : completedTasks}</span>
              <Badge>Done</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pending</CardTitle>
              <CardDescription>Tasks still in progress.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-baseline justify-between">
              <span className="text-3xl font-semibold">{isLoading ? "-" : pendingTasks}</span>
              <Badge variant="outline">Pending</Badge>
            </CardContent>
          </Card>
        </section>

        <section className="max-w-xl space-y-3 animate-fade-in">
          <h2 className="text-lg font-semibold">Account</h2>
          <div className="rounded-lg border bg-card/60 p-4">
            <p className="text-sm text-muted-foreground">Signed in as</p>
            <p className="truncate text-sm font-medium">{user?.email}</p>
          </div>
        </section>
      </main>
    </div>
  );
};

export default ProfilePage;
