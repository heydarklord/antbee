import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
    const cookieStore = await cookies()

    return createServerClient(
        'https://buunbfdtelddsngbcuyx.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1dW5iZmR0ZWxkZHNuZ2JjdXl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMjI0MTksImV4cCI6MjA4Mzc5ODQxOX0.5x4oNKezd6z9jl1EX5jj8wk3_pZ1cAY7alxnXvm8uGE',
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    )
}
