'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EXPIRY_OPTIONS, ExpiryType, calculateExpiryDate } from '@/lib/file-hosting'
import { Upload, X, File as FileIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export default function UploadPage() {
    const router = useRouter()
    const [file, setFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)
    const [expiry, setExpiry] = useState<ExpiryType>('never')
    const [mimeType, setMimeType] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)
    const supabase = createClient()
    const queryClient = useQueryClient()

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0]
            setFile(selectedFile)
            setMimeType(selectedFile.type || 'application/octet-stream')
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const selectedFile = e.dataTransfer.files[0]
            setFile(selectedFile)
            setMimeType(selectedFile.type || 'application/octet-stream')
        }
    }

    const handleUpload = async () => {
        if (!file) return

        try {
            setUploading(true)
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const fileExt = file.name.split('.').pop()
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
            const filePath = `${user.id}/${fileName}`

            // 1. Upload to Storage
            const { error: uploadError } = await supabase.storage
                .from('hosted_files')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            // 2. Insert Metadata into DB
            const expiryDate = calculateExpiryDate(expiry)
            const { error: dbError } = await supabase
                .from('hosted_files')
                .insert({
                    user_id: user.id,
                    name: file.name,
                    storage_path: filePath,
                    mime_type: mimeType,
                    size: file.size,
                    expiry_type: expiry,
                    expires_at: expiryDate ? expiryDate.toISOString() : null,
                })

            if (dbError) throw dbError

            toast.success('File uploaded successfully')
            await queryClient.invalidateQueries({ queryKey: ['hosted_files'] })
            router.push('/files')
        } catch (error: any) {
            console.error('Upload error:', error)
            toast.error(error.message || 'Failed to upload file')
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className="flex flex-col h-full p-6 max-w-2xl mx-auto w-full">
            <div className="mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Upload File</h1>
                <p className="text-muted-foreground mt-2">
                    Upload a file to host and share.
                </p>
            </div>

            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle>File Details</CardTitle>
                    <CardDescription>Configure file settings before uploading.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* File Dropzone */}
                    {!file ? (
                        <div
                            className="border-2 border-dashed border-border rounded-xl p-12 text-center hover:bg-muted/50 transition-colors cursor-pointer"
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleDrop}
                            onClick={() => inputRef.current?.click()}
                        >
                            <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-lg font-medium mb-1">Drag file here</h3>
                            <p className="text-sm text-muted-foreground">or click to browse</p>
                            <input
                                ref={inputRef}
                                type="file"
                                className="hidden"
                                onChange={handleFileSelect}
                            />
                        </div>
                    ) : (
                        <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-background/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded text-primary">
                                    <FileIcon className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="font-medium">{file.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {(file.size / 1024).toFixed(2)} KB
                                    </p>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setFile(null)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    )}

                    {/* Expiry Selection */}
                    <div className="space-y-2">
                        <Label>Expires In</Label>
                        <Select value={expiry} onValueChange={(v) => setExpiry(v as ExpiryType)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select expiry" />
                            </SelectTrigger>
                            <SelectContent>
                                {EXPIRY_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* MIME Type Editing */}
                    <div className="space-y-2">
                        <Label>MIME Type</Label>
                        <div className="flex gap-2">
                            <Input
                                value={mimeType}
                                onChange={(e) => setMimeType(e.target.value)}
                                placeholder="e.g. application/json"
                            />
                            <Button
                                variant="outline"
                                onClick={() => setMimeType(file?.type || 'application/octet-stream')}
                                title="Reset to detected type"
                            >
                                Reset
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            You can manually override the MIME type if needed (e.g. force text/plain for a .js file).
                        </p>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="ghost" onClick={() => router.back()}>Cancel</Button>
                        <Button onClick={handleUpload} disabled={!file || uploading}>
                            {uploading ? 'Uploading...' : 'Upload File'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
