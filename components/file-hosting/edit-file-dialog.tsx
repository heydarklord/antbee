'use client'

import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useState, useEffect } from 'react'
import { EXPIRY_OPTIONS, ExpiryType, getExpiryLabel, calculateExpiryDate } from '@/lib/file-hosting'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface HostedFile {
    id: string
    name: string
    mime_type: string
    expiry_type: string
    expires_at: string | null
}

interface EditFileDialogProps {
    file: HostedFile | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

export function EditFileDialog({ file, open, onOpenChange, onSuccess }: EditFileDialogProps) {
    const [mimeType, setMimeType] = useState('')
    const [expiryType, setExpiryType] = useState<ExpiryType>('never')
    const [loading, setLoading] = useState(false)
    const supabase = createClient()

    useEffect(() => {
        if (file) {
            setMimeType(file.mime_type)
            setExpiryType(file.expiry_type as ExpiryType)
        }
    }, [file])

    const handleSave = async () => {
        if (!file) return

        try {
            setLoading(true)
            const updates: any = {
                mime_type: mimeType,
                expiry_type: expiryType,
            }

            // Only update expiry date if type changed or it's needed
            // Actually, if we change type, we should recalculate date from NOW?
            // Or from original creation? User probably expects from NOW if they extended it.
            // Let's assume from NOW for simplicity and utility.
            const newExpiryDate = calculateExpiryDate(expiryType)
            updates.expires_at = newExpiryDate ? newExpiryDate.toISOString() : null

            const { error } = await supabase
                .from('hosted_files')
                .update(updates)
                .eq('id', file.id)

            if (error) throw error

            toast.success('File updated successfully')
            onSuccess()
            onOpenChange(false)
        } catch (error) {
            console.error('Error updating file:', error)
            toast.error('Failed to update file')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit File</DialogTitle>
                    <DialogDescription>
                        Make changes to the file settings here. Click save when you're done.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                            Name
                        </Label>
                        <Input id="name" value={file?.name || ''} disabled className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="mime" className="text-right">
                            MIME Type
                        </Label>
                        <Input
                            id="mime"
                            value={mimeType}
                            onChange={(e) => setMimeType(e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="expiry" className="text-right">
                            Expiry
                        </Label>
                        <div className="col-span-3">
                            <Select value={expiryType} onValueChange={(v) => setExpiryType(v as ExpiryType)}>
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
                    </div>
                </div>
                <DialogFooter>
                    <Button type="submit" onClick={handleSave} disabled={loading}>
                        {loading ? 'Saving...' : 'Save changes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
