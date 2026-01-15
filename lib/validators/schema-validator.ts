export type FieldSchema = {
    name: string
    jsonKey: string
    type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'any'
    isOptional: boolean
    rawType: string
    nestedType?: string
}

export type ValidationStatus = 'valid' | 'missing_required' | 'missing_optional' | 'type_mismatch' | 'numeric_coercion'

export type FieldAnalysis = {
    path: string
    expectedType: string
    actualType: string | null
    isRequired: boolean
    value: any
    status: ValidationStatus
}

export type TraceStep = {
    step: string
    path: string
    message: string
    status: 'success' | 'warning' | 'error' | 'info'
    timestamp: number
}

export type ValidationReport = {
    isValid: boolean
    errors: string[]
    missingRequiredFields: string[]
    missingOptionalFields: string[]
    analysis: FieldAnalysis[]
    trace: TraceStep[]
}

export class SchemaValidator {

    static parseSchemas(code: string, lang: 'swift' | 'kotlin'): { schemas: Record<string, FieldSchema[]>, root: string | null } {
        const schemas: Record<string, FieldSchema[]> = {}
        let root: string | null = null

        const lines = code.split('\n')
        let currentScope: string | null = null
        let scopeMappings: Record<string, string> = {}
        let pendingSerialName: string | null = null

        const structPattern = lang === 'swift'
            ? /struct\s+(\w+)/
            : /(?:data\s+)?class\s+(\w+)/

        const swiftFieldPattern = /(?:let|var)\s+(\w+)\s*:\s*([^=\n]+)/
        const swiftCodingKeyPattern = /case\s+(\w+)\s*=\s*"([^"]+)"/
        const kotlinSingleLinePattern = /(?:@SerialName\s*\(\s*"([^"]+)"\s*\)\s*)?(?:val|var)\s+(\w+)\s*:\s*([\w<>?,\s\[\]:]+)/
        const kotlinAnnotationPattern = /@SerialName\s*\(\s*"([^"]+)"\s*\)/
        const kotlinFieldOnlyPattern = /(?:val|var)\s+(\w+)\s*:\s*([\w<>?,\s\[\]:]+)/

        for (const line of lines) {
            const trimmedLine = line.trim()
            if (!trimmedLine || trimmedLine.startsWith('//')) continue

            const structMatch = structPattern.exec(trimmedLine)
            if (structMatch) {
                const structName = structMatch[1]
                currentScope = structName
                scopeMappings = {}
                pendingSerialName = null
                if (!root) root = structName
                if (!schemas[structName]) schemas[structName] = []
                continue
            }

            if (currentScope) {
                if (lang === 'swift') {
                    const fieldMatch = swiftFieldPattern.exec(trimmedLine)
                    if (fieldMatch) {
                        const name = fieldMatch[1]
                        let rawType = fieldMatch[2].trim()
                        if (rawType.includes('//')) rawType = rawType.split('//')[0].trim()

                        if (!schemas[currentScope].some(f => f.name === name)) {
                            const mappedKey = scopeMappings[name] || name
                            schemas[currentScope].push({
                                name,
                                jsonKey: mappedKey,
                                rawType,
                                type: this.mapType(rawType),
                                isOptional: rawType.endsWith('?'),
                                nestedType: this.extractNestedType(rawType)
                            })
                        }
                    }

                    const keyMatch = swiftCodingKeyPattern.exec(trimmedLine)
                    if (keyMatch) {
                        const propertyName = keyMatch[1]
                        const jsonKey = keyMatch[2]
                        scopeMappings[propertyName] = jsonKey
                        const existingField = schemas[currentScope].find(f => f.name === propertyName)
                        if (existingField) existingField.jsonKey = jsonKey
                    }

                } else {
                    const annotationMatch = kotlinAnnotationPattern.exec(trimmedLine)
                    if (annotationMatch) {
                        pendingSerialName = annotationMatch[1]
                        continue
                    }

                    let fieldMatch = kotlinSingleLinePattern.exec(trimmedLine)
                    if (!fieldMatch) {
                        const simpleMatch = kotlinFieldOnlyPattern.exec(trimmedLine)
                        if (simpleMatch) {
                            fieldMatch = [simpleMatch[0], pendingSerialName || undefined, simpleMatch[1], simpleMatch[2]] as any
                        }
                    }

                    if (fieldMatch) {
                        const customKey = fieldMatch[1] || pendingSerialName
                        const name = fieldMatch[2]
                        let rawType = fieldMatch[3].trim()
                        if (rawType.includes('//')) rawType = rawType.split('//')[0].trim()

                        if (!schemas[currentScope].some(f => f.name === name)) {
                            schemas[currentScope].push({
                                name,
                                jsonKey: customKey || name,
                                rawType,
                                type: this.mapType(rawType),
                                isOptional: rawType.endsWith('?'),
                                nestedType: this.extractNestedType(rawType)
                            })
                        }
                        pendingSerialName = null
                    }
                }
            }
        }
        return { schemas, root }
    }

    private static mapType(raw: string): FieldSchema['type'] {
        const t = raw.replace('?', '').trim()
        if (t.startsWith('[') && t.includes(':')) return 'object'
        if (t.startsWith('[') || t.startsWith('Array<') || t.startsWith('List<')) return 'array'
        if (t === 'String') return 'string'
        if (['Int', 'Double', 'Float', 'Long', 'CGFloat', 'number'].includes(t)) return 'number'
        if (['Bool', 'Boolean'].includes(t)) return 'boolean'
        return 'object'
    }

    private static extractNestedType(raw: string): string | undefined {
        let t = raw.replace('?', '').trim()
        if (t.startsWith('[') && t.includes(':')) return undefined
        if (t.startsWith('[') && t.endsWith(']')) t = t.substring(1, t.length - 1)
        else if ((t.startsWith('Array<') || t.startsWith('List<')) && t.endsWith('>')) {
            const start = t.indexOf('<') + 1
            t = t.substring(start, t.length - 1)
        }
        const baseType = t.trim()
        if (['String', 'Int', 'Double', 'Float', 'Bool', 'Boolean'].includes(baseType)) return undefined
        return baseType
    }

    static validate(json: any, code: string, lang: 'swift' | 'kotlin', strict: boolean = true): ValidationReport {
        const { schemas, root } = this.parseSchemas(code, lang)
        const report: ValidationReport = {
            isValid: true,
            errors: [],
            missingRequiredFields: [],
            missingOptionalFields: [],
            analysis: [],
            trace: []
        }

        const log = (step: string, path: string, message: string, status: TraceStep['status'] = 'info') => {
            report.trace.push({ step, path, message, status, timestamp: Date.now() })
        }

        log('Init', 'root', `Starting validation against root type: ${root || 'None'}`)

        if (!root) {
            report.isValid = false
            report.errors.push("No Struct or Class definition found.")
            log('Error', 'root', 'No schemas parsed from code', 'error')
            return report
        }

        this.validateScope(json, root, schemas, report, '', log, strict)

        report.errors = [...new Set(report.errors)]
        report.missingRequiredFields = [...new Set(report.missingRequiredFields)]
        report.missingOptionalFields = [...new Set(report.missingOptionalFields)]

        if (report.errors.length > 0 || report.missingRequiredFields.length > 0) {
            report.isValid = false
        }

        log('Complete', 'root', `Validation finished with ${report.errors.length} errors`, report.isValid ? 'success' : 'error')
        return report
    }

    private static validateScope(
        data: any,
        scopeName: string,
        schemas: Record<string, FieldSchema[]>,
        report: ValidationReport,
        pathPrefix: string,
        log: (step: string, path: string, message: string, status: TraceStep['status']) => void,
        strict: boolean
    ) {
        const fields = schemas[scopeName]
        if (!fields) return

        if (typeof data !== 'object' || data === null) {
            const msg = `Expected object for type '${scopeName}' at '${pathPrefix || 'root'}', got ${typeof data}`
            report.errors.push(msg)
            log('Type Check', pathPrefix || 'root', msg, 'error')
            return
        }

        log('Enter Scope', pathPrefix || 'root', `Validating properties for ${scopeName}`, 'info')

        for (const field of fields) {
            const key = field.jsonKey
            const currentPath = pathPrefix ? `${pathPrefix}.${key}` : key
            const value = data[key]
            const exists = key in data

            const analysis: FieldAnalysis = {
                path: currentPath,
                expectedType: field.rawType,
                actualType: exists ? (value === null ? 'null' : typeof value) : 'undefined',
                isRequired: !field.isOptional,
                value: value,
                status: 'valid'
            }

            // 1. Existence
            if (!exists || value === null) {
                if (!field.isOptional) {
                    report.missingRequiredFields.push(currentPath)
                    analysis.status = 'missing_required'
                    log('Missing Field', currentPath, `Required field '${key}' is missing`, 'error')
                } else {
                    report.missingOptionalFields.push(currentPath)
                    analysis.status = 'missing_optional'
                    log('Missing Field', currentPath, `Optional field '${key}' is missing`, 'warning')
                }
                report.analysis.push(analysis)
                continue
            }

            // 2. Type Checking
            if (exists && value !== null) {
                let typeMatch = false

                if (field.type === 'array') {
                    if (!Array.isArray(value)) {
                        const msg = `Type mismatch: Expected Array, got ${typeof value}`
                        report.errors.push(`${msg} at ${currentPath}`)
                        analysis.status = 'type_mismatch'
                        log('Type Mismatch', currentPath, msg, 'error')
                    } else {
                        typeMatch = true
                        if (field.nestedType && schemas[field.nestedType]) {
                            value.forEach((item, index) => {
                                this.validateScope(item, field.nestedType!, schemas, report, `${currentPath}[${index}]`, log, strict)
                            })
                        }
                    }
                }
                else if (field.type === 'object' && field.nestedType && schemas[field.nestedType]) {
                    this.validateScope(value, field.nestedType, schemas, report, currentPath, log, strict)
                    typeMatch = true
                }
                else if (field.type !== 'any' && field.type !== 'object') {
                    const actualType = typeof value
                    if (actualType !== field.type) {
                        // Loose Check for Numbers (Int vs Float)
                        if (field.type === 'number' && actualType === 'number') {
                            typeMatch = true
                        } else {
                            const msg = `Type mismatch: Expected ${field.rawType}, got ${actualType}`
                            report.errors.push(`${msg} at ${currentPath}`)
                            analysis.status = 'type_mismatch'
                            log('Type Mismatch', currentPath, msg, 'error')
                        }
                    } else {
                        typeMatch = true
                    }
                } else {
                    typeMatch = true
                }

                if (typeMatch) {
                    log('Valid', currentPath, `Found valid ${field.type}`, 'success')
                }
            }

            report.analysis.push(analysis)
        }
    }
}
