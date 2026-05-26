/**
 * Theme Toggle Component
 * Three-option selector: Light / Dark / System
 */

import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

const options = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

interface ThemeToggleProps {
  onChange?: (theme: string) => void;
}

export function ThemeToggle({ onChange }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  const handleChange = (value: string) => {
    setTheme(value);
    onChange?.(value);
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map(({ value, label, icon: Icon }) => (
        <button type="button"
          key={value}
          onClick={() => handleChange(value)}
          className={cn(
            "flex flex-col items-center gap-2 px-3 py-3 rounded-xl transition-all duration-200 touch-manipulation active:scale-[0.98]",
            theme === value
              ? "bg-primary/10 text-primary ring-1 ring-primary/30"
              : "hover:bg-muted bg-muted/30"
          )}
        >
          <Icon className="w-5 h-5" />
          <span className="text-sm font-medium">{label}</span>
        </button>
      ))}
    </div>
  );
}

export default ThemeToggle;
