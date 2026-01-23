'use client'

import { toast } from "sonner"
import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, MoreHorizontal, Play, Pause, Trash2, Loader2, AlertCircle, Network, Copy, X } from 'lucide-react'
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
    const supabase = createClient()
    const { data: endpoints = [], isLoading, refetch: fetchEndpoints } = useQuery({
        queryKey: ['endpoints'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('endpoints')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) {
                console.error("Error fetching endpoints:", error)
                throw error
            }
            return (data as Endpoint[]) || []
        }
    })

    const [newEndpointName, setNewEndpointName] = useState('')
    const [newEndpointPath, setNewEndpointPath] = useState('')
    const [newEndpointMethod, setNewEndpointMethod] = useState('GET')
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [isCreating, setIsCreating] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')

    const filteredEndpoints = useMemo(() => {
        if (!searchQuery) return endpoints
        const lowerQ = searchQuery.toLowerCase()
        return endpoints.filter(e =>
            e.path.toLowerCase().includes(lowerQ) ||
            e.name.toLowerCase().includes(lowerQ)
        )
    }, [endpoints, searchQuery])

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
            toast.success("Endpoint created successfully")
        } catch (err: any) {
            console.error("Endpoint creation failed:", err)
            let msg = err.message || "An error occurred"
            if (JSON.stringify(err).includes("function not found") || err.code === '42883') {
                msg = "System update required: Please run the latest database migration (create_team function missing)."
            }
            setError(msg)
            toast.error(msg)
        } finally {
            setIsCreating(false)
        }
    }

    const toggleEndpointStatus = async (id: string, currentStatus: boolean) => {
        await supabase.from('endpoints').update({ is_active: !currentStatus }).eq('id', id)
        await fetchEndpoints()
        toast.success(currentStatus ? "Endpoint paused" : "Endpoint activated")
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this endpoint?")) return
        await supabase.from('endpoints').delete().eq('id', id)
        await fetchEndpoints()
        toast.success("Endpoint deleted")
    }

    return (
        <div className="h-full overflow-y-auto">
            <div className="p-8 space-y-8 animate-in bg-background min-h-[calc(100vh-2rem)]">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">Endpoints</h2>
                        <p className="text-muted-foreground mt-1">Manage and monitor your API endpoints.</p>
                    </div>
                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>
                            <Button className="shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all" suppressHydrationWarning>
                                <Plus className="mr-2 h-4 w-4" />
                                Create Endpoint
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px] glass-card border-white/10 bg-[#1e1e1e]">
                            <DialogHeader>
                                <DialogTitle>Create New Endpoint</DialogTitle>
                                <DialogDescription className="text-white/60">
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
                                        className="bg-white/5 border-white/10 focus:border-primary/50"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="method">Method</Label>
                                    <select
                                        id="method"
                                        className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
                                        className="bg-white/5 border-white/10 focus:border-primary/50"
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
                        <Input
                            className="pl-9 bg-card/50 border-white/10 focus:bg-card transition-colors"
                            placeholder="Search endpoints..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-white"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="rounded-xl border border-white/5 bg-card/40 backdrop-blur-sm shadow-sm overflow-hidden">
                    <div className="relative w-full overflow-auto">
                        <table className="w-full caption-bottom text-sm">
                            <thead className="[&_tr]:border-b">
                                <tr className="border-b border-white/5 transition-colors hover:bg-muted/50">
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
                                ) : filteredEndpoints.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-16 text-center text-muted-foreground">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center mb-2">
                                                    {searchQuery ? <Search className="h-6 w-6 opacity-30" /> : <Network className="h-8 w-8 opacity-30" />}
                                                </div>
                                                <p className="font-medium text-foreground text-lg">{searchQuery ? 'No matching endpoints' : 'No endpoints found'}</p>
                                                <p className="text-sm text-white/40 max-w-[200px]">{searchQuery ? `No endpoints found matching "${searchQuery}"` : 'Create your first endpoint to get started.'}</p>
                                                {searchQuery && (
                                                    <Button variant="link" onClick={() => setSearchQuery('')} className="text-primary mt-2">
                                                        Clear search
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredEndpoints.map((endpoint) => (
                                        <tr key={endpoint.id} className="border-b border-white/5 transition-all hover:bg-white/[0.02] group">
                                            <td className="p-6 align-middle">
                                                <Link href={`/endpoints/${endpoint.id}`} className="flex flex-col gap-1">
                                                    <span className="font-semibold text-foreground group-hover:text-primary transition-colors text-base">{endpoint.path}</span>
                                                    <span className="text-xs text-muted-foreground">{endpoint.name}</span>
                                                </Link>
                                            </td>
                                            <td className="p-6 align-middle">
                                                <Badge variant="outline" className={cn(
                                                    "uppercase font-mono text-xs px-2.5 py-0.5",
                                                    endpoint.method === 'GET' && "border-blue-500/50 text-blue-400 bg-blue-500/10",
                                                    endpoint.method === 'POST' && "border-green-500/50 text-green-400 bg-green-500/10",
                                                    endpoint.method === 'DELETE' && "border-red-500/50 text-red-400 bg-red-500/10",
                                                    endpoint.method === 'PUT' && "border-orange-500/50 text-orange-400 bg-orange-500/10",
                                                    endpoint.method === 'PATCH' && "border-yellow-500/50 text-yellow-400 bg-yellow-500/10",
                                                )}>
                                                    {endpoint.method}
                                                </Badge>
                                            </td>
                                            <td className="p-6 align-middle">
                                                <span className={cn(
                                                    "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border",
                                                    endpoint.is_active
                                                        ? "bg-green-500/10 text-green-500 border-green-500/20"
                                                        : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                                                )}>
                                                    <span className={cn("h-1.5 w-1.5 rounded-full", endpoint.is_active ? "bg-green-500 animate-pulse" : "bg-yellow-500")} />
                                                    {endpoint.is_active ? "Active" : "Paused"}
                                                </span>
                                            </td>
                                            <td className="p-6 align-middle text-muted-foreground text-xs font-mono">
                                                {formatDistanceToNow(new Date(endpoint.created_at), { addSuffix: true })}
                                            </td>
                                            <td className="p-6 align-middle text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 hover:bg-white/10 hover:text-white"
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(`${window.location.origin}/api/mock${endpoint.path}`);
                                                            toast.success("Copied URL to clipboard")
                                                        }}
                                                        title="Copy URL"
                                                    >
                                                        <Copy className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 hover:bg-white/10 hover:text-white"
                                                        onClick={() => toggleEndpointStatus(endpoint.id, endpoint.is_active)}
                                                        title={endpoint.is_active ? "Pause Endpoint" : "Activate Endpoint"}
                                                    >
                                                        {endpoint.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 hover:bg-red-500/20 hover:text-red-400 text-muted-foreground"
                                                        onClick={() => handleDelete(endpoint.id)}
                                                        title="Delete Endpoint"
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
        </div>
    )
}
