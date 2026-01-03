import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import { NavLink } from "@/components/NavLink";
import { useToast } from "@/hooks/use-toast";

interface LayoutShellProps {
  title?: string;
  description?: string;
  children: ReactNode;
}

export const LayoutShell = ({ title, description, children }: LayoutShellProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();

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

    navigate("/auth", { replace: true });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Background blobs */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-32 -top-40 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute right-[-6rem] top-10 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute bottom-[-5rem] left-10 h-72 w-72 rounded-full bg-secondary/20 blur-3xl" />
      </div>

      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="container flex flex-col gap-3 py-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 pulse" />
              <span>TaskFlow · live</span>
            </div>
            {title && (
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                {title}
              </h1>
            )}
            {description && (
              <p className="max-w-md text-sm text-muted-foreground">{description}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:justify-end">
            <nav className="flex items-center gap-1 rounded-full bg-muted/70 p-1">
              <Button asChild variant="ghost" size="sm" className="rounded-full px-3 text-xs sm:text-sm">
                <NavLink
                  to="/"
                  end
                  className="hover-scale rounded-full"
                  activeClassName="bg-background text-foreground shadow-sm"
                >
                  Dashboard
                </NavLink>
              </Button>
              <Button asChild variant="ghost" size="sm" className="rounded-full px-3 text-xs sm:text-sm">
                <NavLink
                  to="/profile"
                  className="hover-scale rounded-full"
                  activeClassName="bg-background text-foreground shadow-sm"
                >
                  Profile
                </NavLink>
              </Button>
            </nav>
            <ThemeToggle />
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="rounded-full border-border/70 bg-background/60 text-xs sm:text-sm hover:bg-background"
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="relative container space-y-6 py-6">{children}</main>
    </div>
  );
};
