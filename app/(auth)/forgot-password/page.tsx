'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const supabase = createClient()

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${location.origin}/auth/update-password`,
        })

        if (error) {
            setError(error.message)
            setIsLoading(false)
        } else {
            setSuccess(true)
            setIsLoading(false)
        }
    }

    if (success) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background px-4">
                <Card className="w-full max-w-md border-border bg-card">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
                        <CardDescription>
                            We&apos;ve sent a password reset link to <strong>{email}</strong>.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center pb-8">
                        <Link href="/login">
                            <Button variant="outline">Back to Login</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <Card className="w-full max-w-md border-border bg-card relative z-10">
            <CardHeader className="space-y-1 text-center">
                <CardTitle className="text-2xl font-bold">Forgot password?</CardTitle>
                <CardDescription>
                    Enter your email address and we&apos;ll send you a link to reset your password.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleReset} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email address</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="name@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    {error && (
                        <div className="text-sm text-destructive">{error}</div>
                    )}

                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Send Reset Link
                    </Button>
                </form>
            </CardContent>
            <CardFooter className="justify-center border-t p-4">
                <Link href="/login" className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Login
                </Link>
            </CardFooter>
        </Card>
    )
}
