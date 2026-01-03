import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import ThemeToggle from "@/components/ThemeToggle";
import useAuthState from "@/hooks/use-auth-state";

interface TaskCountRow {
  status: "pending" | "completed";
  count: number;
}

interface Profile {
  id: string;
  user_id: string;
  name: string | null;
  avatar_url: string | null;
}

const ProfilePage = () => {
  const { user, loading } = useAuthState();
  const queryClient = useQueryClient();

  const { data: counts = [], isLoading: isCountsLoading } = useQuery<TaskCountRow[]>({
    queryKey: ["task-counts", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("tasks")
        .select("status, id")
        .eq("user_id", user.id);

      if (error) {
        throw error;
      }

      const rows = (data ?? []) as { status: "pending" | "completed"; id: string }[];
      const summary: Record<string, number> = {};

      for (const row of rows) {
        summary[row.status] = (summary[row.status] ?? 0) + 1;
      }

      return Object.entries(summary).map(([status, count]) => ({
        status: status as "pending" | "completed",
        count,
      }));
    },
    enabled: !!user,
  });


  const { data: profile } = useQuery<Profile | null>({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, name, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      return (data as Profile) ?? null;
    },
    enabled: !!user,
  });

  const { data: recentTasks = [], isLoading: isRecentLoading } = useQuery<
    { id: string; title: string; status: "pending" | "completed"; created_at: string }[]
  >({
    queryKey: ["recent-tasks", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, status, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) {
        throw error;
      }

      return (
        data as { id: string; title: string; status: "pending" | "completed"; created_at: string }[]
      )
        ?.filter(Boolean)
        .map((task) => task);
    },
    enabled: !!user,
  });


  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (profile || user) {
      setName(profile?.name ?? user?.email?.split("@")[0] ?? "");
      setAvatarUrl(profile?.avatar_url ?? "");
    }
  }, [profile, user]);

  const upsertProfile = useMutation({
    mutationFn: async () => {
      if (!user) return;

      const { error } = await supabase.from("profiles").upsert(
        {
          user_id: user.id,
          name: name || null,
          avatar_url: avatarUrl || null,
        },
        { onConflict: "user_id" },
      );

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
    },
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
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button variant="ghost" asChild>
              <Link to="/" className="hover-scale">
                Back to dashboard
              </Link>
            </Button>
          </div>
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
              <span className="text-3xl font-semibold">
                {isCountsLoading ? (
                  <span className="inline-block h-8 w-10 rounded-md bg-muted animate-pulse" />
                ) : (
                  totalTasks
                )}
              </span>
              <Badge variant="secondary">Total</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Completed</CardTitle>
              <CardDescription>Tasks you have finished.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-baseline justify-between">
              <span className="text-3xl font-semibold text-primary">
                {isCountsLoading ? (
                  <span className="inline-block h-8 w-10 rounded-md bg-muted animate-pulse" />
                ) : (
                  completedTasks
                )}
              </span>
              <Badge>Done</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pending</CardTitle>
              <CardDescription>Tasks still in progress.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-baseline justify-between">
              <span className="text-3xl font-semibold">
                {isCountsLoading ? (
                  <span className="inline-block h-8 w-10 rounded-md bg-muted animate-pulse" />
                ) : (
                  pendingTasks
                )}
              </span>
              <Badge variant="outline">Pending</Badge>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-start animate-fade-in">
          <Card className="space-y-4">
            <CardHeader className="space-y-2">
              <CardTitle>Account</CardTitle>
              <CardDescription>Update your profile details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={avatarUrl || undefined} alt={name || user?.email || "User avatar"} />
                  <AvatarFallback className="bg-muted text-sm font-medium">
                    {name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Signed in as</p>
                  <p className="truncate text-sm font-medium">{user?.email}</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="profile-name">Display name</Label>
                  <Input
                    id="profile-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="profile-avatar">Avatar URL</Label>
                  <Input
                    id="profile-avatar"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="Link to an image for your avatar"
                  />
                  <p className="text-xs text-muted-foreground">
                    Paste a URL to an image. File uploads can be added later with storage.
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Button
                    onClick={() => upsertProfile.mutate()}
                    disabled={upsertProfile.isPending || (!name.trim() && !avatarUrl.trim())}
                  >
                    {upsertProfile.isPending ? "Saving..." : "Save changes"}
                  </Button>
                  {justSaved && (
                    <p className="text-xs text-muted-foreground animate-fade-in">
                      Profile updated.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="space-y-4">
            <CardHeader className="space-y-2">
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your latest tasks.</CardDescription>
            </CardHeader>
            <CardContent>
              {isRecentLoading ? (
                <p className="text-sm text-muted-foreground">Loading recent tasks...</p>
              ) : recentTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">You haven't created any tasks yet.</p>
              ) : (
                <ul className="space-y-3">
                  {recentTasks.map((task) => (
                    <li
                      key={task.id}
                      className="flex items-start justify-between gap-3 rounded-md border bg-card/60 p-3 animate-fade-in"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-medium max-w-xs truncate">{task.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(task.created_at).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant={task.status === "completed" ? "default" : "secondary"}>
                        {task.status === "completed" ? "Completed" : "Pending"}
                      </Badge>
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

export default ProfilePage;
