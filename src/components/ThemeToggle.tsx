import { useEffect, useState, forwardRef } from "react";
import type { ComponentPropsWithoutRef } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

type ThemeToggleProps = ComponentPropsWithoutRef<typeof Button>;

const ThemeToggle = forwardRef<HTMLButtonElement, ThemeToggleProps>(
  ({ className, ...props }, ref) => {
    const { resolvedTheme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
      setMounted(true);
    }, []);

    if (!mounted) return null;

    const isDark = resolvedTheme === "dark";

    return (
      <Button
        ref={ref}
        type="button"
        variant="outline"
        size="icon"
        className={`relative hover-scale${className ? ` ${className}` : ""}`}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        onClick={() => setTheme(isDark ? "light" : "dark")}
        {...props}
      >
        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    );
  },
);

ThemeToggle.displayName = "ThemeToggle";

export default ThemeToggle;
