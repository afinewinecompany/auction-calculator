import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  // Whitespace-nowrap: Badges should never wrap.
  "whitespace-nowrap inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-smooth focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2" +
  " hover-elevate " ,
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-xs",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow-xs",

        outline: " border [border-color:var(--badge-outline)] shadow-xs",

        // Phase 2: Position badge variants
        "position-infield": "bg-baseball-leather/20 text-baseball-leather border-baseball-leather/30 hover:bg-baseball-leather/30",
        "position-outfield": "bg-baseball-green/20 text-baseball-green-dark border-baseball-green/30 hover:bg-baseball-green/30",
        "position-pitcher": "bg-baseball-navy/20 text-baseball-navy border-baseball-navy/30 hover:bg-baseball-navy/30",
        "position-util": "bg-muted text-muted-foreground border-border hover:bg-muted/80",

        // Phase 2: Status badge variants
        "status-drafted": "bg-destructive/20 text-destructive border-destructive/30",
        "status-available": "bg-baseball-green/20 text-baseball-green-dark border-baseball-green/30",
        "status-targeted": "bg-warning/20 text-warning border-warning/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants }
