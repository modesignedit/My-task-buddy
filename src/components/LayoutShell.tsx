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
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/60 backdrop-blur">
        <div className="container flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            {title && <h1 className="text-xl font-semibold tracking-tight">{title}</h1>}
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:justify-end">
            <nav className="flex items-center gap-1 sm:gap-2">
              <Button asChild variant="ghost" size="sm">
                <NavLink
                  to="/"
                  className="hover-scale px-2 sm:px-3"
                  activeClassName="bg-muted text-foreground"
                  end
                >
                  Dashboard
                </NavLink>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <NavLink
                  to="/profile"
                  className="hover-scale px-2 sm:px-3"
                  activeClassName="bg-muted text-foreground"
                >
                  Profile
                </NavLink>
              </Button>
            </nav>
            <ThemeToggle />
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container space-y-6 py-6">{children}</main>
    </div>
  );
};
