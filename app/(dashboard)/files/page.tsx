'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Copy, Trash2, Eye, File as FileIcon, MoreHorizontal, Pencil } from 'lucide-react'
import Link from 'next/link'
import { formatFileSize, getExpiryLabel } from '@/lib/file-hosting'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { EditFileDialog } from '@/components/file-hosting/edit-file-dialog'
import { DeleteConfirmDialog } from '@/components/delete-confirm-dialog'

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

export default function FilesPage() {
    const [editingFile, setEditingFile] = useState<HostedFile | null>(null)
    const supabase = createClient()
    const { data: files = [], isLoading: loading, refetch: fetchFiles } = useQuery({
        queryKey: ['hosted_files'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return []

            const { data, error } = await supabase
                .from('hosted_files')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })

            if (error) {
                console.error('Error fetching files:', error)
                toast.error('Failed to load files')
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
            // Delete from Storage
            const { error: storageError } = await supabase
                .storage
                .from('hosted_files')
                .remove([storagePath])

            if (storageError) {
                console.error('Storage delete error:', storageError)
            }

            // Delete from DB
            const { error: dbError } = await supabase
                .from('hosted_files')
                .delete()
                .eq('id', id)

            if (dbError) throw dbError

            toast.success('File deleted successfully')
            fetchFiles()
            setDeleteState(null)
        } catch (error) {
            console.error('Error deleting file:', error)
            toast.error('Failed to delete file')
        }
    }

    const copyLink = (id: string, name: string, type: 'view' | 'raw') => {
        const baseUrl = window.location.origin
        // NOTE: Use /api/content for raw, /view for public view
        const url = type === 'view' ? `${baseUrl}/view/${id}` : `${baseUrl}/api/content/${id}/${name}`
        console.log(`[FilesPage] Copying ${type} link:`, url)
        navigator.clipboard.writeText(url)
        toast.success(`${type === 'view' ? 'View' : 'Raw'} link copied to clipboard`)
    }

    const isExpired = (file: HostedFile) => {
        if (!file.expires_at) return false
        return new Date(file.expires_at) < new Date()
    }

    return (
        <div className="flex flex-col h-full p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Files</h1>
                    <p className="text-muted-foreground mt-2">
                        Host and share files with expiry options.
                    </p>
                </div>
                <Link href="/files/upload">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Upload File
                    </Button>
                </Link>
            </div>

            <Card className="flex-1 bg-card/50 backdrop-blur-sm border-border/50">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-muted/50 border-border/50">
                                <TableHead>Name</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Size</TableHead>
                                <TableHead>Expiry</TableHead>
                                <TableHead>Views</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        Loading files...
                                    </TableCell>
                                </TableRow>
                            ) : files.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                        No files uploaded yet.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                files.map((file) => (
                                    <TableRow key={file.id} className="group hover:bg-muted/50 border-border/50">
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                                    <FileIcon className="h-4 w-4" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="truncate max-w-[200px]" title={file.name}>{file.name}</span>
                                                    {isExpired(file) && <span className="text-xs text-destructive">Expired</span>}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{file.mime_type}</TableCell>
                                        <TableCell className="text-muted-foreground">{formatFileSize(file.size)}</TableCell>
                                        <TableCell>
                                            <Badge variant={file.expiry_type === 'never' ? 'secondary' : 'outline'}>
                                                {getExpiryLabel(file.expiry_type as any)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                                <Eye className="h-3.5 w-3.5" />
                                                <span>{file.views}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => copyLink(file.id, file.name, 'view')} title="Copy View Link">
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => copyLink(file.id, file.name, 'raw')} title="Copy Raw Link">
                                                    <Copy className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => setEditingFile(file)} title="Edit">
                                                    <Pencil className="h-4 w-4" />
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

            <EditFileDialog
                file={editingFile}
                open={!!editingFile}
                onOpenChange={(open) => !open && setEditingFile(null)}
                onSuccess={fetchFiles}
            />

            <DeleteConfirmDialog
                open={!!deleteState}
                onOpenChange={(open) => !open && setDeleteState(null)}
                onConfirm={() => deleteState && confirmDelete(deleteState.id, deleteState.storagePath)}
                title="Delete File"
                description="Are you sure you want to delete this file? This action cannot be undone."
            />
        </div>
    )
}
