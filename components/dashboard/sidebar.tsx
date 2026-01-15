'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, Activity, Network, Settings, LogOut, Hexagon, BarChart3, Terminal, User, Sun, Moon, Braces } from 'lucide-react'
import { useTheme } from "next-themes"
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
    { href: '/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/requests', label: 'Logs', icon: Terminal },
    { href: '/endpoints', label: 'Endpoints', icon: Network },
    { href: '/gui-editor', label: 'GUI Editor', icon: Braces },
    { href: '/settings', label: 'Settings', icon: Settings },
]

function ThemeToggle() {
    const { theme, setTheme } = useTheme()
    return (
        <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
            <Sun className="h-4 w-4 mr-2 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 mr-2 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="ml-2">Theme</span>
        </Button>
    )
}

interface SidebarProps {
    className?: string
    onClose?: () => void
}

export function Sidebar({ className, onClose }: SidebarProps) {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()
    const [userEmail, setUserEmail] = useState<string | null>(null)

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user && user.email) {
                setUserEmail(user.email)
            }
        }
        getUser()
    }, [])

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    return (
        <div className={cn("flex h-screen w-72 flex-col border-r border-border bg-card/50 backdrop-blur-xl", className)}>
            <div className="flex h-20 items-center px-6 border-b border-border/50">
                <div className="flex items-center gap-3 font-bold text-xl tracking-tight text-foreground transition-all duration-300 hover:scale-[1.02]">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/20">
                        <Hexagon className="h-6 w-6 fill-current" />
                    </div>
                    <span>MockAPI</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto py-8 px-4">
                <nav className="space-y-1.5">
                    {navItems.map((item) => {
                        const Icon = item.icon
                        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={onClose}
                                className={cn(
                                    "group relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 outline-none",
                                    isActive
                                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground hover:pl-5"
                                )}
                            >
                                <Icon className={cn("h-5 w-5 transition-transform duration-200 group-hover:scale-110", isActive && "animate-pulse")} />
                                <span>{item.label}</span>
                                {isActive && (
                                    <div className="absolute right-4 h-1.5 w-1.5 rounded-full bg-primary-foreground animate-ping" />
                                )}
                            </Link>
                        )
                    })}
                </nav>
            </div>

            <div className="p-4 mt-auto">
                <div className="rounded-xl border border-border bg-card/50 p-4 mb-2 animate-in slide-in-from-bottom-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center border border-border">
                            <User className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="overflow-hidden flex-1">
                            <p className="text-sm font-medium truncate">{userEmail || 'Loading...'}</p>
                            <p className="text-xs text-muted-foreground">Free Plan</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <ThemeToggle />
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            onClick={handleSignOut}
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            Sign out
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
