"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, Loader2, Network, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface ImportEndpointModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onImport: (payload: string, endpoint?: any) => void
}

export function ImportEndpointModal({ open, onOpenChange, onImport }: ImportEndpointModalProps) {
    const [endpoints, setEndpoints] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedEndpoint, setSelectedEndpoint] = useState<any>(null)
    const [selectedType, setSelectedType] = useState<'response' | 'request'>('response')
    const supabase = createClient()

    useEffect(() => {
        if (open) {
            fetchEndpoints()
        }
    }, [open])

    const fetchEndpoints = async () => {
        setIsLoading(true)
        const { data, error } = await supabase.from('endpoints').select('*').order('created_at', { ascending: false })
        if (data) setEndpoints(data)
        setIsLoading(false)
    }

    const filteredEndpoints = endpoints.filter(e =>
        e.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const handleConfirm = async () => {
        if (!selectedEndpoint) return

        setIsLoading(true)
        try {
            // Fetch the actual response configured for this endpoint
            const { data: responses, error } = await supabase
                .from('endpoint_responses')
                .select('body')
                .eq('endpoint_id', selectedEndpoint.id)
                .order('created_at', { ascending: false })
                .limit(1)

            if (responses && responses.length > 0 && responses[0].body) {
                // Determine if body is object or string, try to parse if string
                let payload = responses[0].body
                if (typeof payload === 'string') {
                    try {
                        // Check if it's already JSON string
                        JSON.parse(payload)
                        // It is valid JSON string, but we want to pass the string to the editor
                    } catch {
                        // It might be a plain string, structure it
                        payload = JSON.stringify({ message: payload })
                    }
                } else {
                    payload = JSON.stringify(payload, null, 2)
                }
                onImport(payload, selectedEndpoint)
            } else {
                // Fallback if no response found
                const fallback = {
                    message: "No response configured for this endpoint yet.",
                    endpoint: selectedEndpoint.path
                }
                onImport(JSON.stringify(fallback, null, 2), selectedEndpoint)
            }
        } catch (err) {
            console.error("Failed to import", err)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] h-[500px] flex flex-col p-0 gap-0 bg-[#1e1e1e] border-white/10 overflow-hidden">
                <div className="p-6 border-b border-white/5">
                    <DialogHeader>
                        <DialogTitle>Import from Endpoint</DialogTitle>
                        <DialogDescription>
                            Select an existing endpoint to import its payload structure.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="relative mt-4">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search endpoints..."
                            className="pl-9 bg-white/5 border-white/10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <ScrollArea className="flex-1 bg-black/20">
                    <div className="p-2 space-y-1">
                        {isLoading ? (
                            <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                                <Loader2 className="h-6 w-6 animate-spin mb-2" />
                                Loading...
                            </div>
                        ) : filteredEndpoints.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground">
                                No endpoints found.
                            </div>
                        ) : (
                            filteredEndpoints.map(endpoint => (
                                <button
                                    key={endpoint.id}
                                    onClick={() => setSelectedEndpoint(endpoint)}
                                    className={cn(
                                        "w-full flex items-center justify-between p-3 rounded-lg text-left transition-all border border-transparent",
                                        selectedEndpoint?.id === endpoint.id
                                            ? "bg-primary/20 border-primary/50"
                                            : "hover:bg-white/5 hover:border-white/10"
                                    )}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={cn(
                                            "h-8 w-8 rounded-md flex items-center justify-center shrink-0 text-xs font-bold",
                                            endpoint.method === 'GET' && "bg-blue-500/20 text-blue-400",
                                            endpoint.method === 'POST' && "bg-green-500/20 text-green-400",
                                            endpoint.method === 'DELETE' && "bg-red-500/20 text-red-400",
                                            endpoint.method === 'PUT' && "bg-orange-500/20 text-orange-400",
                                            endpoint.method === 'PATCH' && "bg-yellow-500/20 text-yellow-400",
                                        )}>
                                            {endpoint.method}
                                        </div>
                                        <div className="truncate">
                                            <div className="font-medium text-sm text-foreground truncate">{endpoint.path}</div>
                                            <div className="text-xs text-muted-foreground truncate">{endpoint.name}</div>
                                        </div>
                                    </div>
                                    {selectedEndpoint?.id === endpoint.id && (
                                        <Check className="h-4 w-4 text-primary shrink-0" />
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </ScrollArea>

                <div className="p-4 border-t border-white/5 bg-muted/5 flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleConfirm} disabled={!selectedEndpoint}>
                        Import Payload
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
