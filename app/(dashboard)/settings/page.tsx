'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Copy, RefreshCw, Plus, MoreVertical, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function SettingsPage() {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [teams, setTeams] = useState<any[]>([])
    const [currentTeam, setCurrentTeam] = useState<any>(null)
    const [apiKeys, setApiKeys] = useState<any[]>([])
    const [members, setMembers] = useState<any[]>([])

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
        <div className="p-8 space-y-8 max-w-5xl mx-auto">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Team and API Settings</h2>
                <p className="text-muted-foreground">Manage your team access, roles, and API configuration.</p>
            </div>

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
