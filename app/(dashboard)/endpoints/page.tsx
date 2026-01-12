'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, MoreHorizontal, Play, Pause, Trash2, Loader2, AlertCircle, Network } from 'lucide-react'


import { cn } from '@/lib/utils'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

type Endpoint = {
    id: string
    name: string
    method: string
    path: string
    is_active: boolean
    created_at: string
}

export default function EndpointsPage() {
    const [endpoints, setEndpoints] = useState<Endpoint[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [newEndpointName, setNewEndpointName] = useState('')
    const [newEndpointPath, setNewEndpointPath] = useState('')
    const [newEndpointMethod, setNewEndpointMethod] = useState('GET')
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [isCreating, setIsCreating] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const supabase = createClient()

    const fetchEndpoints = async () => {
        setIsLoading(true)
        const { data, error } = await supabase
            .from('endpoints')
            .select('*')
            .order('created_at', { ascending: false })

        if (data) {
            setEndpoints(data as Endpoint[])
        }
        setIsLoading(false)
    }

    useEffect(() => {
        fetchEndpoints()
    }, [])

    const handleCreateEndpoint = async () => {
        setError(null)
        setIsCreating(true)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("Not authenticated")

            // 1. Get or Create Team
            let teamId: string | null = null
            const { data: teams } = await supabase.from('team_members').select('team_id').eq('user_id', user.id).limit(1)

            if (teams && teams.length > 0) {
                teamId = teams[0].team_id
            } else {
                // Create a team using the secure RPC
                const { data: newTeamId, error: teamError } = await supabase.rpc('create_team', { name: 'My Team' })

                if (teamError) {
                    console.error("Team creation error:", teamError)
                    throw new Error("Could not create a team. Please try again.")
                }

                if (newTeamId) {
                    teamId = newTeamId
                }
            }

            if (!teamId) throw new Error("No team found or created")

            // 2. Create Endpoint
            const safePath = newEndpointPath.startsWith('/') ? newEndpointPath : `/${newEndpointPath}`

            const { error: endpointError } = await supabase.from('endpoints').insert({
                team_id: teamId,
                name: newEndpointName,
                method: newEndpointMethod,
                path: safePath,
            })

            if (endpointError) throw endpointError

            setIsCreateOpen(false)
            setNewEndpointName('')
            setNewEndpointPath('')
            fetchEndpoints()
        } catch (err: any) {
            console.error("Endpoint creation failed:", err)
            let msg = err.message || "An error occurred"
            if (JSON.stringify(err).includes("function not found") || err.code === '42883') {
                msg = "System update required: Please run the latest database migration (create_team function missing)."
            }
            setError(msg)
        } finally {
            setIsCreating(false)
        }
    }

    const toggleEndpointStatus = async (id: string, currentStatus: boolean) => {
        await supabase.from('endpoints').update({ is_active: !currentStatus }).eq('id', id)
        // Optimistic update
        setEndpoints(prev => prev.map(e => e.id === id ? { ...e, is_active: !currentStatus } : e))
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this endpoint?")) return
        await supabase.from('endpoints').delete().eq('id', id)
        setEndpoints(prev => prev.filter(e => e.id !== id))
    }

    return (
        <div className="p-8 space-y-8 animate-in bg-background min-h-screen">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">Endpoints</h2>
                    <p className="text-muted-foreground mt-1">Manage and monitor your API endpoints.</p>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
                            <Plus className="mr-2 h-4 w-4" />
                            Create Endpoint
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px] glass-card">
                        <DialogHeader>
                            <DialogTitle>Create New Endpoint</DialogTitle>
                            <DialogDescription>
                                Setup a new mock endpoint for your API.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            {error && (
                                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4" />
                                    {error}
                                </div>
                            )}
                            <div className="grid gap-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    value={newEndpointName}
                                    onChange={(e) => setNewEndpointName(e.target.value)}
                                    placeholder="e.g. Get Users"
                                    className="bg-background/50"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="method">Method</Label>
                                <select
                                    id="method"
                                    className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    value={newEndpointMethod}
                                    onChange={(e) => setNewEndpointMethod(e.target.value)}
                                >
                                    <option value="GET">GET</option>
                                    <option value="POST">POST</option>
                                    <option value="PUT">PUT</option>
                                    <option value="DELETE">DELETE</option>
                                    <option value="PATCH">PATCH</option>
                                </select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="path">Path</Label>
                                <Input
                                    id="path"
                                    value={newEndpointPath}
                                    onChange={(e) => setNewEndpointPath(e.target.value)}
                                    placeholder="/api/users"
                                    className="bg-background/50"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleCreateEndpoint} disabled={isCreating}>
                                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isCreating ? 'Creating...' : 'Create Endpoint'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="flex items-center space-x-2">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-9 bg-card/50" placeholder="Search endpoints..." />
                </div>
            </div>

            <div className="rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm shadow-sm overflow-hidden">
                <div className="relative w-full overflow-auto">
                    <table className="w-full caption-bottom text-sm">
                        <thead className="[&_tr]:border-b">
                            <tr className="border-b border-border/50 transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                <th className="h-12 px-6 text-left align-middle font-medium text-muted-foreground">Endpoint</th>
                                <th className="h-12 px-6 text-left align-middle font-medium text-muted-foreground">Method</th>
                                <th className="h-12 px-6 text-left align-middle font-medium text-muted-foreground">Status</th>
                                <th className="h-12 px-6 text-left align-middle font-medium text-muted-foreground">Created</th>
                                <th className="h-12 px-6 text-right align-middle font-medium text-muted-foreground">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="[&_tr:last-child]:border-0">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center">
                                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                            <p>Loading endpoints...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : endpoints.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-2">
                                                <Network className="h-6 w-6 opacity-50" />
                                            </div>
                                            <p className="font-medium text-foreground">No endpoints found</p>
                                            <p className="text-sm">Create your first endpoint to get started.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                endpoints.map((endpoint) => (
                                    <tr key={endpoint.id} className="border-b border-border/50 transition-colors hover:bg-muted/50 group">
                                        <td className="p-6 align-middle">
                                            <Link href={`/endpoints/${endpoint.id}`} className="flex flex-col gap-1">
                                                <span className="font-semibold text-foreground group-hover:text-primary transition-colors">{endpoint.path}</span>
                                                <span className="text-xs text-muted-foreground">{endpoint.name}</span>
                                            </Link>
                                        </td>
                                        <td className="p-6 align-middle">
                                            <Badge variant="outline" className={cn(
                                                "uppercase font-mono text-xs",
                                                endpoint.method === 'GET' && "border-blue-500/50 text-blue-500 bg-blue-500/10",
                                                endpoint.method === 'POST' && "border-green-500/50 text-green-500 bg-green-500/10",
                                                endpoint.method === 'DELETE' && "border-red-500/50 text-red-500 bg-red-500/10",
                                                endpoint.method === 'PUT' && "border-orange-500/50 text-orange-500 bg-orange-500/10",
                                            )}>
                                                {endpoint.method}
                                            </Badge>
                                        </td>
                                        <td className="p-6 align-middle">
                                            <span className={cn(
                                                "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border",
                                                endpoint.is_active
                                                    ? "bg-green-500/10 text-green-600 border-green-500/20"
                                                    : "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                                            )}>
                                                <span className={cn("h-1.5 w-1.5 rounded-full", endpoint.is_active ? "bg-green-500" : "bg-yellow-500")} />
                                                {endpoint.is_active ? "Active" : "Paused"}
                                            </span>
                                        </td>
                                        <td className="p-6 align-middle text-muted-foreground text-xs font-mono">
                                            {formatDistanceToNow(new Date(endpoint.created_at), { addSuffix: true })}
                                        </td>
                                        <td className="p-6 align-middle text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 hover:bg-background"
                                                    onClick={() => toggleEndpointStatus(endpoint.id, endpoint.is_active)}
                                                >
                                                    {endpoint.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                                                    onClick={() => handleDelete(endpoint.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
