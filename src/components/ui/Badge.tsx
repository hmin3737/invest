import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "danger" | "warning" | "blue" | "purple";
  className?: string;
}

export default function Badge({ children, variant = "default", className }: BadgeProps) {
  const variants = {
    default: "bg-slate-700 text-slate-300",
    success: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
    danger: "bg-red-500/15 text-red-400 border border-red-500/30",
    warning: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30",
    blue: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
    purple: "bg-purple-500/15 text-purple-400 border border-purple-500/30",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
