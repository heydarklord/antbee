"use client"

import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { type Rule } from './response-rules'

interface BodyRulesEditorProps {
    rule: Rule
    onChange: (field: string, value: any) => void
}

export function BodyRulesEditor({ rule, onChange }: BodyRulesEditorProps) {
    if (rule.condition.type !== 'body') return null

    return (
        <div className="flex flex-col gap-3 p-3 bg-muted/40 rounded-md border border-border/50">
            <div className="flex gap-2">
                <div className="flex-1">
                    <label className="text-[10px] uppercase text-muted-foreground font-bold mb-1 block">JSON Path</label>
                    <Input
                        placeholder="e.g. data.user.id"
                        value={rule.condition.key}
                        onChange={(e) => onChange('condition.key', e.target.value)}
                        className="h-8 text-xs font-mono bg-background"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                        Use dot notation for nested keys.
                    </p>
                </div>
                <div className="w-[140px]">
                    <label className="text-[10px] uppercase text-muted-foreground font-bold mb-1 block">Operator</label>
                    <Select
                        value={rule.condition.operator}
                        onValueChange={(v: any) => onChange('condition.operator', v)}
                    >
                        <SelectTrigger className="h-8 text-xs bg-background"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="equals">Equals (=)</SelectItem>
                            <SelectItem value="not_equals">Not Equals (!=)</SelectItem>
                            <SelectItem value="contains">Contains</SelectItem>
                            <SelectItem value="exists">Exists</SelectItem>
                            <SelectItem value="deep_equals">Deep Equals</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {rule.condition.operator !== 'exists' && (
                <div>
                    <label className="text-[10px] uppercase text-muted-foreground font-bold mb-1 block">Expected Value</label>
                    <Input
                        placeholder="Value to match..."
                        value={rule.condition.value}
                        onChange={(e) => onChange('condition.value', e.target.value)}
                        className="h-8 text-xs font-mono bg-background"
                    />
                </div>
            )}
        </div>
    )
}
