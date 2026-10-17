import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant =
  | "default"
  | "destructive"
  | "outline"
  | "secondary"
  | "ghost"
  | "link";

type ButtonSize = "default" | "sm" | "lg" | "icon";

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
}

function buttonVariants({
  variant = "default",
  size = "default",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  return cn(
    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
    variant === "default" && "bg-primary text-primary-foreground hover:bg-primary/90",
    variant === "destructive" &&
      "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    variant === "outline" &&
      "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
    variant === "secondary" &&
      "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    variant === "ghost" && "hover:bg-accent hover:text-accent-foreground",
    variant === "link" && "text-primary underline-offset-4 hover:underline",
    size === "default" && "h-10 px-4 py-2",
    size === "sm" && "h-9 rounded-md px-3",
    size === "lg" && "h-11 rounded-md px-8",
    size === "icon" && "h-10 w-10",
    className
  );
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? ("span" as React.ElementType) : "button";
    return (
      <Comp
        className={buttonVariants({ variant, size, className })}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
