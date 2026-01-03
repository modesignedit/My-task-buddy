import { useEffect, useMemo, useState, useRef } from "react";
import { Navigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import useAuthState from "@/hooks/use-auth-state";
import { LayoutShell } from "@/components/LayoutShell";
import { useToast } from "@/hooks/use-toast";
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
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: counts = [], isLoading: isCountsLoading, error: countsError } = useQuery<TaskCountRow[]>({
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


  const { data: profile, error: profileError } = useQuery<Profile | null>({
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

  const { data: recentTasks = [], isLoading: isRecentLoading, error: recentError } = useQuery<
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
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (profile || user) {
      setName(profile?.name ?? user?.email?.split("@")[0] ?? "");
      setAvatarUrl(profile?.avatar_url ?? "");
    }
  }, [profile, user]);

  type UpsertProfileArgs = {
    overrideAvatarUrl?: string;
  };

  const upsertProfile = useMutation({
    mutationFn: async (args?: UpsertProfileArgs) => {
      if (!user) return;

      const finalAvatarUrl = args?.overrideAvatarUrl ?? avatarUrl;

      const { error } = await supabase.from("profiles").upsert(
        {
          user_id: user.id,
          name: name || null,
          avatar_url: finalAvatarUrl || null,
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
      toast({ title: "Profile updated" });
    },
    onError: (error: unknown) => {
      toast({
        title: "Could not update profile",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="space-y-3 text-center">
          <div className="mx-auto h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!loading && !user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <LayoutShell
      title="Profile"
      description="See how you&apos;ve been shipping and tweak your vibe."
    >
      <section className="grid gap-3 md:grid-cols-3 md:gap-4 animate-enter">
        <Card className="glass-panel relative overflow-hidden p-4 md:p-6">
          <CardHeader className="space-y-1 p-0">
            <CardTitle className="text-base font-semibold md:text-lg">Total tasks</CardTitle>
            <CardDescription className="text-xs md:text-sm">All tasks you have created.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-baseline justify-between p-0 pt-3 md:pt-4">
            <span className="text-2xl font-semibold md:text-3xl">
              {isCountsLoading ? (
                <span className="inline-block h-8 w-10 rounded-md bg-muted animate-pulse" />
              ) : countsError ? (
                "-"
              ) : (
                totalTasks
              )}
            </span>
            <Badge variant="secondary" className="text-[10px] md:text-xs">
              Total
            </Badge>
          </CardContent>
        </Card>

        <Card className="glass-panel relative overflow-hidden p-4 md:p-6">
          <CardHeader className="space-y-1 p-0">
            <CardTitle className="text-base font-semibold md:text-lg">Completed</CardTitle>
            <CardDescription className="text-xs md:text-sm">Tasks you have finished.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-baseline justify-between p-0 pt-3 md:pt-4">
            <span className="text-2xl font-semibold text-primary md:text-3xl">
              {isCountsLoading ? (
                <span className="inline-block h-8 w-10 rounded-md bg-muted animate-pulse" />
              ) : countsError ? (
                "-"
              ) : (
                completedTasks
              )}
            </span>
            <Badge className="text-[10px] md:text-xs">Done</Badge>
          </CardContent>
        </Card>

        <Card className="glass-panel relative overflow-hidden p-4 md:p-6">
          <CardHeader className="space-y-1 p-0">
            <CardTitle className="text-base font-semibold md:text-lg">Pending</CardTitle>
            <CardDescription className="text-xs md:text-sm">Tasks still in progress.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-baseline justify-between p-0 pt-3 md:pt-4">
            <span className="text-2xl font-semibold md:text-3xl">
              {isCountsLoading ? (
                <span className="inline-block h-8 w-10 rounded-md bg-muted animate-pulse" />
              ) : countsError ? (
                "-"
              ) : (
                pendingTasks
              )}
            </span>
            <Badge variant="outline" className="text-[10px] md:text-xs">
              Pending
            </Badge>
          </CardContent>
        </Card>
      </section>

      <section className="grid items-start gap-5 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-6 animate-fade-in">
        <Card className="glass-panel space-y-4 p-4 md:p-6">
          <CardHeader className="space-y-2 p-0">
            <CardTitle className="text-base font-semibold md:text-lg">Account vibe</CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Update your display name and avatar so people know it&apos;s you.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-0 pt-3 md:pt-4">
            <div className="flex items-center gap-3 md:gap-4">
              <Avatar className="h-14 w-14 md:h-16 md:w-16">
                <AvatarImage src={avatarUrl || undefined} alt={name || user?.email || "User avatar"} />
                <AvatarFallback className="bg-muted text-xs font-medium md:text-sm">
                  {name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground md:text-sm">Signed in as</p>
                <p className="truncate text-sm font-medium">{user?.email}</p>
                {profileError && (
                  <p className="mt-1 text-[11px] text-destructive/80 md:text-xs">
                    There was a problem loading your profile details. You can still edit and save.
                  </p>
                )}
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="profile-name" className="text-xs md:text-sm">
                  Display name
                </Label>
                <Input
                  id="profile-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="profile-avatar" className="text-xs md:text-sm">
                  Avatar URL
                </Label>
                <Input
                  id="profile-avatar"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://images.yoursite.com/me.png"
                />
              </div>
            </div>

            {uploadError && (
              <p className="text-xs text-destructive">{uploadError}</p>
            )}

            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file || !user) return;

                  setUploadError(null);
                  setIsUploadingAvatar(true);

                  const fileExt = file.name.split(".").pop();
                  const fileName = `${user.id}-${Date.now()}.${fileExt}`;
                  const filePath = `${user.id}/${fileName}`;

                  const { error: uploadErrorResult } = await supabase.storage
                    .from("avatars")
                    .upload(filePath, file, {
                      cacheControl: "3600",
                      upsert: true,
                    });

                  if (uploadErrorResult) {
                    setIsUploadingAvatar(false);
                    setUploadError("Could not upload avatar. Please try again.");
                    toast({
                      title: "Avatar upload failed",
                      description: uploadErrorResult.message,
                      variant: "destructive",
                    });
                    return;
                  }

                  const {
                    data: { publicUrl },
                  } = supabase.storage.from("avatars").getPublicUrl(filePath);

                  setAvatarUrl(publicUrl);

                  await upsertProfile.mutateAsync({ overrideAvatarUrl: publicUrl });

                  setIsUploadingAvatar(false);
                }}
              />

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
              >
                {isUploadingAvatar ? "Uploading..." : "Upload avatar"}
              </Button>

              <Button
                onClick={() => upsertProfile.mutate({})}
                disabled={upsertProfile.isPending || (!name.trim() && !avatarUrl.trim())}
                className="bg-gradient-to-r from-primary via-accent to-secondary text-primary-foreground shadow-md shadow-primary/40"
              >
                {upsertProfile.isPending ? "Saving..." : justSaved ? "Saved" : "Save changes"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel space-y-3 p-4 md:p-6">
          <CardHeader className="space-y-1 p-0">
            <CardTitle className="text-base font-semibold md:text-lg">Recent activity</CardTitle>
            <CardDescription className="text-xs md:text-sm">
              A quick log of the last few things you&apos;ve shipped.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 p-0 pt-3 md:pt-4">
            {isRecentLoading ? (
              <div className="space-y-2">
                <div className="h-4 w-1/2 rounded-md bg-muted animate-pulse" />
                <div className="h-4 w-2/3 rounded-md bg-muted/80 animate-pulse" />
                <div className="h-4 w-1/3 rounded-md bg-muted/60 animate-pulse" />
              </div>
            ) : recentError ? (
              <div className="flex flex-col gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive md:text-sm">
                <p>Could not load your recent tasks.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="self-start"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ["recent-tasks", user?.id] })}
                >
                  Try again
                </Button>
              </div>
            ) : recentTasks.length === 0 ? (
              <p className="text-xs text-muted-foreground md:text-sm">
                Nothing here yet. Your future self is going to be proud of this feed.
              </p>
            ) : (
              <ul className="space-y-2 md:space-y-3">
                {recentTasks.map((task) => (
                  <li
                    key={task.id}
                    className="flex items-center justify-between rounded-xl border border-border/70 bg-card/70 px-3 py-2 text-xs transition-colors hover:border-primary/40 hover:bg-primary/5 md:px-4 md:py-3 md:text-sm"
                  >
                    <div>
                      <p className="font-medium">{task.title}</p>
                      <p className="text-[10px] text-muted-foreground md:text-xs">
                        {new Date(task.created_at).toLocaleString()}
                      </p>
                    </div>
                    <Badge
                      variant={task.status === "completed" ? "default" : "outline"}
                      className="text-[10px] md:text-xs"
                    >
                      {task.status === "completed" ? "done" : "in progress"}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </LayoutShell>
  );
};

export default ProfilePage;
