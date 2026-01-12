import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement> {
    variant?: "default" | "secondary" | "destructive" | "outline" | "get" | "post" | "put" | "delete" | "patch"
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
    return (
        <div
            className={cn(
                "inline-flex items-center rounded-sm px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                {
                    "border-transparent bg-primary text-primary-foreground hover:bg-primary/80": variant === "default",
                    "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80": variant === "secondary",
                    "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80": variant === "destructive",
                    "text-foreground": variant === "outline",
                    "border-transparent bg-blue-500/10 text-blue-500": variant === "get",
                    "border-transparent bg-green-500/10 text-green-500": variant === "post",
                    "border-transparent bg-orange-500/10 text-orange-500": variant === "put",
                    "border-transparent bg-red-500/10 text-red-500": variant === "delete",
                    "border-transparent bg-yellow-500/10 text-yellow-500": variant === "patch",
                },
                className
            )}
            {...props}
        />
    )
}

export { Badge }
