'use client'

import { Sidebar } from '@/components/dashboard/sidebar'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const [isMobileOpen, setIsMobileOpen] = useState(false)

    return (
        <div className="flex h-screen bg-background text-foreground overflow-hidden">
            {/* Desktop Sidebar */}
            <div className="hidden md:block">
                <Sidebar />
            </div>

            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 w-full z-50 bg-card/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 h-14">
                <div className="font-bold text-lg">MockAPI</div>
                <Button variant="ghost" size="icon" onClick={() => setIsMobileOpen(true)}>
                    <Menu className="h-5 w-5" />
                </Button>
            </div>

            {/* Mobile Sidebar Overlay */}
            {isMobileOpen && (
                <div className="fixed inset-0 z-50 md:hidden bg-background/80 backdrop-blur-sm">
                    <div className="fixed inset-y-0 left-0 w-72 bg-card border-r shadow-lg animate-in slide-in-from-left duration-300">
                        <div className="absolute right-4 top-4 z-50">
                            <Button variant="ghost" size="icon" onClick={() => setIsMobileOpen(false)}>
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                        <Sidebar className="w-full h-full border-r-0" onClose={() => setIsMobileOpen(false)} />
                    </div>
                    {/* Backdrop click to close */}
                    <div className="absolute inset-0 -z-10" onClick={() => setIsMobileOpen(false)} />
                </div>
            )}

            <main className="flex-1 flex flex-col min-h-0 overflow-hidden md:pt-0 pt-14">
                {children}
            </main>
        </div>
    )
}
