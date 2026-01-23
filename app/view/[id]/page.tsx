import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { ViewClient } from './view-client'
import { AlertCircle } from 'lucide-react'

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function ViewFilePage({ params }: PageProps) {
    const { id } = await params
    const supabase = createAdminClient()

    // Fetch metadata securely (bypassing RLS so properly public)
    const { data: fileData, error } = await supabase
        .from('hosted_files')
        .select('*')
        .eq('id', id)
        .single()

    if (error || !fileData) {
        return notFound()
    }

    // Check Expiry
    if (fileData.expires_at && new Date(fileData.expires_at) < new Date()) {
        return (
            <div className="flex items-center justify-center h-screen flex-col gap-4">
                <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                    <AlertCircle className="h-8 w-8 text-destructive" />
                </div>
                <h1 className="text-2xl font-bold">Link Expired</h1>
                <p className="text-muted-foreground">This file is no longer available.</p>
            </div>
        )
    }

    return (
        <ViewClient
            id={fileData.id}
            name={fileData.name}
            mimeType={fileData.mime_type}
            size={fileData.size}
        />
    )
}
