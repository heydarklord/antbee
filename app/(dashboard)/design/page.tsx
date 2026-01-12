'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Mail, ArrowRight } from 'lucide-react'

export default function DesignPage() {
    return (
        <div className="p-8 space-y-12 max-w-5xl mx-auto">
            <div className="space-y-4">
                <h1 className="text-4xl font-bold">Design System</h1>
                <p className="text-muted-foreground text-lg">Use this page to verify theming and component states.</p>
            </div>

            <section className="space-y-6">
                <h2 className="text-2xl font-semibold border-b pb-2">Buttons</h2>
                <Card>
                    <CardHeader>
                        <CardTitle>Button Variants</CardTitle>
                        <CardDescription>Primary, Secondary, Destructive, Outline, Ghost, Link</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-4 items-center">
                        <Button>Default (Primary)</Button>
                        <Button variant="secondary">Secondary</Button>
                        <Button variant="destructive">Destructive</Button>
                        <Button variant="outline">Outline</Button>
                        <Button variant="ghost">Ghost</Button>
                        <Button variant="link">Link</Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Button Sizes</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-4 items-center">
                        <Button size="sm">Small</Button>
                        <Button size="default">Default</Button>
                        <Button size="lg">Large</Button>
                        <Button size="icon"><ArrowRight className="h-4 w-4" /></Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Button States</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-4 items-center">
                        <Button disabled>Disabled</Button>
                        <Button isLoading>Loading</Button>
                        <Button>
                            <Mail className="mr-2 h-4 w-4" />
                            With Icon
                        </Button>
                    </CardContent>
                </Card>
            </section>

            <section className="space-y-6">
                <h2 className="text-2xl font-semibold border-b pb-2">Inputs & Forms</h2>
                <Card>
                    <CardHeader>
                        <CardTitle>Text Fields</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 max-w-sm">
                        <div className="space-y-2">
                            <Label>Default Input</Label>
                            <Input placeholder="Enter text..." />
                        </div>
                        <div className="space-y-2">
                            <Label>Disabled Input</Label>
                            <Input disabled placeholder="Cannot type here" />
                        </div>
                    </CardContent>
                </Card>
            </section>

            <section className="space-y-6">
                <h2 className="text-2xl font-semibold border-b pb-2">Badges</h2>
                <div className="flex gap-4">
                    <Badge>Default</Badge>
                    <Badge variant="secondary">Secondary</Badge>
                    <Badge variant="outline">Outline</Badge>
                    <Badge variant="destructive">Destructive</Badge>
                </div>
            </section>

            <section className="space-y-6">
                <h2 className="text-2xl font-semibold border-b pb-2">Colors</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="h-20 rounded-md bg-background border flex items-center justify-center">Background</div>
                    <div className="h-20 rounded-md bg-card border flex items-center justify-center">Card</div>
                    <div className="h-20 rounded-md bg-primary text-primary-foreground flex items-center justify-center">Primary</div>
                    <div className="h-20 rounded-md bg-secondary text-secondary-foreground flex items-center justify-center">Secondary</div>
                    <div className="h-20 rounded-md bg-muted text-muted-foreground flex items-center justify-center">Muted</div>
                    <div className="h-20 rounded-md bg-accent text-accent-foreground flex items-center justify-center">Accent</div>
                    <div className="h-20 rounded-md bg-destructive text-destructive-foreground flex items-center justify-center">Destructive</div>
                </div>
            </section>
        </div>
    )
}
