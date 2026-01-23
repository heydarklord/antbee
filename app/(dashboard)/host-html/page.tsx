'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Copy, Trash2, ExternalLink, Code as CodeIcon, Clock, Pencil } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { DeleteConfirmDialog } from '@/components/delete-confirm-dialog'
import { formatDistanceToNow } from 'date-fns'

interface HostedFile {
    id: string
    name: string
    mime_type: string
    size: number
    expiry_type: string
    expires_at: string | null
    views: number
    created_at: string
    storage_path: string
}

export default function HostHtmlListPage() {
    const supabase = createClient()
    const { data: files = [], isLoading: loading, refetch: fetchFiles } = useQuery({
        queryKey: ['hosted_html'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return []

            const { data, error } = await supabase
                .from('hosted_files')
                .select('*')
                .eq('user_id', user.id)
                .eq('mime_type', 'text/html') // FILTER ONLY HTML
                .order('created_at', { ascending: false })

            if (error) {
                console.error('Error fetching html files:', error)
                toast.error('Failed to load pages')
                throw error
            }
            return data || []
        }
    })

    const [deleteState, setDeleteState] = useState<{ id: string, storagePath: string } | null>(null)

    const handleDelete = (id: string, storagePath: string) => {
        setDeleteState({ id, storagePath })
    }

    const confirmDelete = async (id: string, storagePath: string) => {
        try {
            await supabase.storage.from('hosted_files').remove([storagePath])
            const { error: dbError } = await supabase.from('hosted_files').delete().eq('id', id)
            if (dbError) throw dbError
            toast.success('Page deleted')
            fetchFiles()
            setDeleteState(null)
        } catch (error) {
            console.error('Error deleting page:', error)
            toast.error('Failed to delete page')
        }
    }

    const copyLink = (id: string, name: string) => {
        const baseUrl = window.location.origin
        // Use raw content API directly for HTML rendering
        const url = `${baseUrl}/api/content/${id}/${name}`
        navigator.clipboard.writeText(url)
        toast.success('Direct link copied to clipboard')
    }

    const openPage = (id: string, name: string) => {
        const url = `/api/content/${id}/${name}`
        window.open(url, '_blank')
    }

    return (
        <div className="flex flex-col h-full p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Host HTML</h1>
                    <p className="text-muted-foreground mt-2">
                        Host static HTML pages with direct render links.
                    </p>
                </div>
                <Link href="/host-html/create">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Host New Page
                    </Button>
                </Link>
            </div>

            <Card className="flex-1 bg-card/50 backdrop-blur-sm border-border/50">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-muted/50 border-border/50">
                                <TableHead className="pl-6">Page Name</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead>Views</TableHead>
                                <TableHead>Auto-Expiring</TableHead>
                                <TableHead className="text-right pr-6">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">Loading pages...</TableCell>
                                </TableRow>
                            ) : files.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                        No HTML pages hosted yet.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                files.map((file) => (
                                    <TableRow key={file.id} className="group hover:bg-muted/50 border-border/50">
                                        <TableCell className="pl-6 font-medium">
                                            <div className="flex items-center gap-2">
                                                <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                                                    <CodeIcon className="h-4 w-4" />
                                                </div>
                                                <span className="truncate max-w-[300px]" title={file.name}>{file.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-xs">
                                            <div className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {formatDistanceToNow(new Date(file.created_at), { addSuffix: true })}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                                {file.views}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-muted-foreground text-xs">
                                                {file.expiry_type !== 'never' ? formatDistanceToNow(new Date(file.expires_at!)) : 'Never'}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link href={`/host-html/${file.id}/edit`}>
                                                    <Button variant="ghost" size="icon" title="Edit Page">
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                                <Button variant="ghost" size="icon" onClick={() => openPage(file.id, file.name)} title="Open Page">
                                                    <ExternalLink className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => copyLink(file.id, file.name)} title="Copy Direct Link">
                                                    <Copy className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(file.id, file.storage_path)} title="Delete">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <DeleteConfirmDialog
                open={!!deleteState}
                onOpenChange={(open) => !open && setDeleteState(null)}
                onConfirm={() => deleteState && confirmDelete(deleteState.id, deleteState.storagePath)}
                title="Delete Page"
                description="Are you sure you want to delete this page? This cannot be undone."
            />
        </div>
    )
}
