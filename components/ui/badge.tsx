import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary/10 text-primary",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "text-foreground",
        paye:
          "border-transparent bg-emerald-50 text-emerald-700 border-emerald-100",
        partiel:
          "border-transparent bg-amber-50 text-amber-700 border-amber-100",
        impaye: "border-transparent bg-red-50 text-red-700 border-red-100",
        confirme: "border-transparent bg-blue-50 text-blue-700 border-blue-100",
        effectue:
          "border-transparent bg-emerald-50 text-emerald-700 border-emerald-100",
        annule: "border-transparent bg-gray-100 text-gray-600 border-gray-200",
        no_show: "border-transparent bg-orange-50 text-orange-700 border-orange-100",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
