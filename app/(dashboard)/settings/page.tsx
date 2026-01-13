'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Copy, RefreshCw, Plus, MoreVertical, Loader2, Moon, Sun, Monitor, Check } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useTheme } from "next-themes"
import { cn } from '@/lib/utils'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const PRIMARY_COLORS = [
    { name: 'Zinc', class: 'zinc', light: '#18181b', dark: '#fafafa' },
    { name: 'Red', class: 'red', light: '#dc2626', dark: '#ef4444' },
    { name: 'Orange', class: 'orange', light: '#ea580c', dark: '#f97316' },
    { name: 'Green', class: 'green', light: '#16a34a', dark: '#22c55e' },
    { name: 'Blue', class: 'blue', light: '#2563eb', dark: '#3b82f6' },
    { name: 'Violet', class: 'violet', light: '#7c3aed', dark: '#8b5cf6' },
]

export default function SettingsPage() {
    const supabase = createClient()
    const { setTheme, theme } = useTheme()
    const [loading, setLoading] = useState(true)
    const [teams, setTeams] = useState<any[]>([])
    const [currentTeam, setCurrentTeam] = useState<any>(null)
    const [apiKeys, setApiKeys] = useState<any[]>([])
    const [members, setMembers] = useState<any[]>([])
    const [primaryColor, setPrimaryColor] = useState('Zinc')

    useEffect(() => {
        // Load saved color
        const savedColor = localStorage.getItem('primaryColor')
        if (savedColor) {
            applyPrimaryColor(savedColor)
        }
    }, [])

    const applyPrimaryColor = (colorName: string) => {
        const color = PRIMARY_COLORS.find(c => c.name === colorName)
        if (!color) return

        setPrimaryColor(colorName)
        localStorage.setItem('primaryColor', colorName)

        const root = document.documentElement

        if (colorName === 'Zinc') {
            // Reset to default variable logic (handled by CSS usually, but here we force values)
            // Actually, Zinc strategy is special: Black in Light, White in Dark.
            // For others, it's Colored in both.
            root.style.removeProperty('--primary')
            root.style.removeProperty('--primary-foreground')
            root.style.removeProperty('--ring')
            // Re-apply styles will be handled by CSS .dark classes for Zinc/Default
            // But if we have inline styles, they override. So we must clear them.
        } else {
            // For colored themes, we enforce specific colors.
            // Note: This simple implementation sets the SAME color for both modes for simplicity,
            // or we could detect mode. But CSS variables are reactive. 
            // Better approach: Set --primary to a value. 
            // Problem: CSS variables in :root are overridden by inline styles.
            // We need to set distinct values for light/dark if we want them to change.
            // Creating a style tag or using a class would be better, but user asked for "Primary Color".

            // Let's set the variables directly.
            root.style.setProperty('--primary', color.light)
            root.style.setProperty('--primary-foreground', '#ffffff') // Always white text on colored buttons
            root.style.setProperty('--ring', color.light)
        }
    }

    // Refined color applier that handles Dark Mode nuances if needed
    // But for this simplified version, 'Zinc' clears overrides returning to globals.css logic.
    // Colored ones enforce the specific color.

    useEffect(() => {
        async function loadData() {
            setLoading(true)

            // 1. Get User Teams
            const { data: teamMembers } = await supabase.from('team_members').select('team_id, role, teams(*)')

            if (teamMembers && teamMembers.length > 0) {
                const teamsList = teamMembers.map((tm: any) => ({ ...tm.teams, role: tm.role }))
                setTeams(teamsList)
                const active = teamsList[0]
                setCurrentTeam(active)

                // 2. Get API Keys for active team
                if (active) {
                    const { data: keys } = await supabase.from('api_keys').select('*').eq('team_id', active.id)
                    setApiKeys(keys || [])

                    // 3. Get Members
                    const { data: mems } = await supabase.from('team_members').select('*, teams(*)').eq('team_id', active.id)
                    setMembers(mems || [])
                }
            }
            setLoading(false)
        }
        loadData()
    }, [])

    const createApiKey = async () => {
        if (!currentTeam) return
        const key = `pk_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`
        const { data, error } = await supabase.from('api_keys').insert({
            team_id: currentTeam.id,
            key: key
        }).select().single()

        if (data) setApiKeys([...apiKeys, data])
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
        alert("Copied to clipboard")
    }

    if (loading) return <div className="p-8 flex items-center justify-center"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>

    return (
        <div className="p-8 space-y-8 max-w-5xl mx-auto h-full overflow-y-auto">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
                <p className="text-muted-foreground">Manage your preferences, team, and API configuration.</p>
            </div>

            {/* APPEARANCE */}
            <Card>
                <CardHeader>
                    <CardTitle>Appearance</CardTitle>
                    <CardDescription>Customize the look and feel of the dashboard.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-3">
                        <Label>Theme</Label>
                        <div className="flex items-center gap-2">
                            <Button
                                variant={theme === 'light' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setTheme('light')}
                                className="w-24"
                            >
                                <Sun className="mr-2 h-4 w-4" /> Light
                            </Button>
                            <Button
                                variant={theme === 'dark' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setTheme('dark')}
                                className="w-24"
                            >
                                <Moon className="mr-2 h-4 w-4" /> Dark
                            </Button>
                            <Button
                                variant={theme === 'system' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setTheme('system')}
                                className="w-24"
                            >
                                <Monitor className="mr-2 h-4 w-4" /> System
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label>Primary Color</Label>
                        <div className="flex items-center gap-3">
                            {PRIMARY_COLORS.map((color) => (
                                <button
                                    key={color.name}
                                    onClick={() => applyPrimaryColor(color.name)}
                                    className={cn(
                                        "h-9 w-9 rounded-full flex items-center justify-center border-2 transition-all",
                                        primaryColor === color.name ? "border-foreground" : "border-transparent",
                                    )}
                                    style={{ backgroundColor: color.light }} // Using light variant for swatch
                                    title={color.name}
                                >
                                    {primaryColor === color.name && <Check className="h-4 w-4 text-white" />}
                                </button>
                            ))}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                            Choose a primary color for buttons, active states, and accents.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {currentTeam && (
                <>
                    <Card>
                        <CardHeader>
                            <CardTitle>API Configuration</CardTitle>
                            <CardDescription>Manage API keys for accessing your mocks programmatically.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <Label>Team ID</Label>
                                <div className="flex items-center gap-2">
                                    <div className="bg-muted px-3 py-2 rounded-md font-mono text-sm flex-1">{currentTeam.id}</div>
                                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard(currentTeam.id)}><Copy className="h-4 w-4" /></Button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label>API Keys</Label>
                                    <Button size="sm" variant="outline" onClick={createApiKey}>Generate New Key</Button>
                                </div>

                                {apiKeys.length === 0 ? (
                                    <div className="text-sm text-muted-foreground italic bg-muted/30 p-4 rounded-md border border-dashed">No API keys generated.</div>
                                ) : (
                                    apiKeys.map((k) => (
                                        <div key={k.id} className="grid gap-2">
                                            <div className="flex items-center gap-2">
                                                <div className="bg-muted px-3 py-2 rounded-md font-mono text-sm flex-1 flex justify-between items-center">
                                                    <span>{k.key}</span>
                                                    <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => copyToClipboard(k.key)}><Copy className="h-3 w-3" /></Button>
                                                </div>
                                                <Button variant="ghost" size="icon" className="text-destructive"><RefreshCw className="h-3 w-3" /></Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                                <p className="text-xs text-muted-foreground">Use these keys to authenticate requests if your endpoints are protected.</p>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-medium">Team Members</h3>
                            <p className="text-sm text-muted-foreground">Members of <strong>{currentTeam.name}</strong></p>
                        </div>
                    </div>

                    <div className="border rounded-lg bg-card overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 text-muted-foreground font-medium">
                                <tr>
                                    <th className="px-4 py-3 text-left">USER ID</th>
                                    <th className="px-4 py-3 text-left">ROLE</th>
                                    <th className="px-4 py-3 text-left">JOINED</th>
                                    <th className="px-4 py-3 text-right">ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {members.map((m) => (
                                    <tr key={m.id}>
                                        <td className="px-4 py-3 font-mono text-xs">{m.user_id}</td>
                                        <td className="px-4 py-3">
                                            <Badge variant={m.role === 'owner' ? 'default' : 'outline'} className="capitalize">
                                                {m.role}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {new Date(m.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => alert("Edit Role feature coming soon")}>
                                                        Edit Role
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => alert("Remove Member feature coming soon")}>
                                                        Remove Member
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <Card className="border-destructive/50 bg-destructive/5">
                        <CardHeader>
                            <CardTitle className="text-destructive">Danger Zone</CardTitle>
                            <CardDescription>Irreversible actions for your team data.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium">Clear Request Logs</p>
                                    <p className="text-sm text-muted-foreground">Delete all request history and reset analytics.</p>
                                </div>
                                <Button
                                    variant="destructive"
                                    onClick={async () => {
                                        if (!confirm("Are you sure? This will delete ALL request logs.")) return;
                                        setLoading(true)
                                        await supabase.from('request_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000') // Efficient "Delete All" for owned rows
                                        alert("Logs cleared")
                                        window.location.reload()
                                    }}
                                >
                                    Clear All Logs
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}

            {!loading && !currentTeam && (
                <div className="text-center py-12">
                    <h3 className="text-lg font-medium">No Team Found</h3>
                    <p className="text-muted-foreground">You don't seem to have a team yet.</p>
                </div>
            )}
        </div>
    )
}

