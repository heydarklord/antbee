import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !key) {
        console.error("Supabase Environment Variables Missing! Please configure .env.local")
        // Return a dummy client to prevent app crash, allowing UI to show config instructions
        const mockClient = createBrowserClient('https://placeholder.supabase.co', 'placeholder')
        // @ts-ignore - injecting custom flag
        mockClient.isMock = true
        return mockClient
    }

    // Debug credential usage (remove in production)
    console.log("[Supabase] Connecting to:", url)

    return createBrowserClient(url, key)
}
