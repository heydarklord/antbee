"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, Save, GripVertical } from 'lucide-react'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../ui/select"
import { Badge } from '@/components/ui/badge'

type Rule = {
    id: string
    condition: {
        type: 'header' | 'query' | 'body'
        key: string
        operator: 'equals' | 'contains' | 'exists'
        value: string
    }
    response_id: string
    priority: number
}

export function ResponseRules({ endpointId }: { endpointId: string }) {
    const [rules, setRules] = useState<Rule[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        fetchRules()
    }, [endpointId])

    const fetchRules = async () => {
        const { data } = await supabase
            .from('response_rules')
            .select('*')
            .eq('endpoint_id', endpointId)
            .order('priority', { ascending: true })

        if (data) {
            setRules(data as Rule[])
        }
        setLoading(false)
    }

    const addRule = () => {
        const newRule: Rule = {
            id: `temp-${Date.now()}`,
            condition: { type: 'query', key: '', operator: 'equals', value: '' },
            response_id: '',
            priority: rules.length
        }
        setRules([...rules, newRule])
    }

    const updateRule = (index: number, field: string, value: any) => {
        const newRules = [...rules]
        if (field.startsWith('condition.')) {
            const condField = field.split('.')[1]
            newRules[index].condition = { ...newRules[index].condition, [condField]: value }
        } else {
            // @ts-ignore
            newRules[index][field] = value
        }
        setRules(newRules)
    }

    const deleteRule = async (index: number) => {
        const rule = rules[index]
        if (!rule.id.startsWith('temp-')) {
            await supabase.from('response_rules').delete().eq('id', rule.id)
        }
        setRules(rules.filter((_, i) => i !== index))
    }

    const saveRules = async () => {
        // Upsert rules
        // For simplicity, we just save them individually. Batch would be better.
        let hasError = false
        for (const rule of rules) {
            const payload = {
                endpoint_id: endpointId,
                condition: rule.condition,
                response_id: rule.response_id || null, // null means use default or specific logic?
                priority: rule.priority
            }

            if (rule.id.startsWith('temp-')) {
                const { data, error } = await supabase.from('response_rules').insert(payload).select().single()
                if (error) {
                    console.error("Error creating rule:", error)
                    hasError = true
                } else if (data) {
                    // update local state id
                    rule.id = data.id
                }
            } else {
                const { error } = await supabase.from('response_rules').update(payload).eq('id', rule.id)
                if (error) {
                    console.error("Error updating rule:", error)
                    hasError = true
                }
            }
        }

        if (hasError) {
            alert("Some rules failed to save. Check console for details.")
        } else {
            alert("Rules saved successfully")
        }
        fetchRules()
    }

    if (loading) return <div>Loading rules...</div>

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <Button onClick={addRule} size="sm" variant="ghost" className="h-6 text-xs text-primary px-2 hover:bg-primary/10 -ml-2">
                    <Plus className="mr-1 h-3 w-3" /> Add Rule
                </Button>
            </div>

            <div className="space-y-2">
                {rules.length === 0 && (
                    <div className="py-4 text-center text-[10px] text-muted-foreground italic">
                        No rules active
                    </div>
                )}
                {rules.map((rule, i) => (
                    <div key={rule.id} className="group relative border rounded-md bg-muted/20 p-2 text-xs space-y-2 hover:border-border/80 transition-colors">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground w-8">If</span>

                            <Select
                                value={rule.condition.type}
                                onValueChange={(v: "query" | "header" | "body") => updateRule(i, 'condition.type', v)}
                            >
                                <SelectTrigger className="h-6 text-[10px] w-20"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="query">Query</SelectItem>
                                    <SelectItem value="header">Header</SelectItem>
                                    <SelectItem value="body">Body</SelectItem>
                                </SelectContent>
                            </Select>

                            <Input
                                placeholder="Key"
                                value={rule.condition.key}
                                onChange={(e) => updateRule(i, 'condition.key', e.target.value)}
                                className="h-6 text-[10px] flex-1 min-w-0"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <Select
                                value={rule.condition.operator}
                                onValueChange={(v: "equals" | "contains" | "exists") => updateRule(i, 'condition.operator', v)}
                            >
                                <SelectTrigger className="h-6 text-[10px] w-[5.5rem]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="equals">Equals</SelectItem>
                                    <SelectItem value="contains">Contains</SelectItem>
                                    <SelectItem value="exists">Exists</SelectItem>
                                </SelectContent>
                            </Select>

                            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground w-8">Then</span>

                                <div className="flex items-center gap-2 flex-1">
                                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">Return Status</span>
                                    <Input
                                        placeholder="200"
                                        value={(rule.condition as any).action_status || ''}
                                        onChange={(e) => updateRule(i, 'condition.action_status', e.target.value)}
                                        className="h-6 w-12 text-[10px] font-mono text-center"
                                    />
                                    <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">Body (JSON)</span>
                                    <Input
                                        placeholder='{"msg": "ok"}'
                                        value={(rule.condition as any).action_body || ''}
                                        onChange={(e) => updateRule(i, 'condition.action_body', e.target.value)}
                                        className="h-6 text-[10px] flex-1 min-w-0 font-mono text-green-500"
                                    />
                                </div>

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                                    onClick={() => deleteRule(i)}
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {
                rules.length > 0 && (
                    <div className="pt-2">
                        <Button onClick={saveRules} size="sm" className="w-full h-7 text-xs">Save Rules</Button>
                    </div>
                )
            }
        </div>
    )
}
