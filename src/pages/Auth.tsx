import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import useAuthState from "@/hooks/use-auth-state";

const authSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const AuthPage = () => {
  const { user, loading } = useAuthState();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [formState, setFormState] = useState({ email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  const handleChange = (field: "email" | "password") =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setFormState((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleSignUp = async () => {
    const parseResult = authSchema.safeParse(formState);
    if (!parseResult.success) {
      toast({
        title: "Invalid details",
        description: parseResult.error.issues[0]?.message ?? "Please fix the highlighted fields.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email: formState.email,
      password: formState.password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    setSubmitting(false);

    if (error) {
      toast({
        title: "Sign up failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Check your email",
      description: "We sent you a confirmation link to complete sign up.",
    });
  };

  const handleSignIn = async () => {
    const parseResult = authSchema.safeParse(formState);
    if (!parseResult.success) {
      toast({
        title: "Invalid details",
        description: parseResult.error.issues[0]?.message ?? "Please fix the highlighted fields.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: formState.email,
      password: formState.password,
    });

    setSubmitting(false);

    if (error) {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Welcome back", description: "You are now logged in." });
    navigate("/", { replace: true });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-40 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute right-[-6rem] top-10 h-72 w-72 rounded-full bg-accent/25 blur-3xl" />
        <div className="absolute bottom-[-5rem] left-10 h-72 w-72 rounded-full bg-secondary/25 blur-3xl" />
      </div>

      <Card className="relative z-10 w-full max-w-md glass-panel accent-ring animate-fade-in">
        <CardHeader className="space-y-2 pb-2 text-center">
          <CardTitle className="text-3xl font-semibold tracking-tight">TaskFlow</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Your personal command center. Built for messy brains and big dreams.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2" aria-busy={submitting}>
              <TabsTrigger value="login" disabled={submitting}>
                Login
              </TabsTrigger>
              <TabsTrigger value="signup" disabled={submitting}>
                Sign Up
              </TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={formState.email}
                  onChange={handleChange("email")}
                  placeholder="you@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={formState.password}
                  onChange={handleChange("password")}
                  placeholder="••••••••"
                />
              </div>
              <Button className="w-full" onClick={handleSignIn} disabled={submitting}>
                {submitting ? "Beaming you in..." : "Login"}
              </Button>
            </TabsContent>
            <TabsContent value="signup" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  value={formState.email}
                  onChange={handleChange("email")}
                  placeholder="you@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  autoComplete="new-password"
                  value={formState.password}
                  onChange={handleChange("password")}
                  placeholder="At least 6 characters"
                />
              </div>
              <Button className="w-full" onClick={handleSignUp} disabled={submitting}>
                {submitting ? "Spinning up your space..." : "Sign Up"}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthPage;
