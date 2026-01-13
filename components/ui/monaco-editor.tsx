"use client"

import React from 'react'
import Editor, { OnMount } from "@monaco-editor/react"
import { useTheme } from "next-themes"

interface MonacoEditorProps {
    value: string
    onChange?: (value: string | undefined) => void
    language?: string
    readOnly?: boolean
    className?: string
}

export function MonacoEditor({ value, onChange, language = "json", readOnly = false, className }: MonacoEditorProps) {
    const { theme } = useTheme()

    const handleEditorDidMount: OnMount = (editor, monaco) => {
        // Optional: formatting on load or other configs
        // editor.getAction('editor.action.formatDocument')?.run()
    }

    return (
        <div className={`h-full w-full ${className}`}>
            <Editor
                height="100%"
                defaultLanguage={language}
                value={value}
                onChange={onChange}
                theme={theme === "light" ? "light" : "vs-dark"}
                options={{
                    readOnly,
                    minimap: { enabled: true },
                    fontSize: 14,
                    wordWrap: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    formatOnPaste: true,
                    formatOnType: true,
                    padding: { top: 16, bottom: 16 },
                }}
                onMount={handleEditorDidMount}
            />
        </div>
    )
}
