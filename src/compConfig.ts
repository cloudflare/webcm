import { z } from 'zod'

export const NamedComponentConfigShape = z.object({
  name: z.string(),
  settings: z.object({}).catchall(z.unknown()).optional(),
  permissions: z.array(z.string()),
})

export type NamedComponentConfig = z.infer<typeof NamedComponentConfigShape>

export const DirectComponentConfigShape = z.object({
  path: z.string(),
  settings: z.object({}).catchall(z.unknown()).optional(),
  permissions: z.array(z.string()),
})

export type DirectComponentConfig = z.infer<typeof DirectComponentConfigShape>

export const ComponentConfigShape = z.union([
  NamedComponentConfigShape,
  DirectComponentConfigShape,
])

export function isComponentConfig(
  config: Record<string, unknown>
): config is ComponentConfig {
  const parseResult = ComponentConfigShape.safeParse(config)
  return parseResult.success
}

export function explainProblemsWithConfig(config: Record<string, unknown>) {
  const parseResult = ComponentConfigShape.safeParse(config)
  if (!parseResult.success) {
    const mainIssue = parseResult.error.issues[0]
    if (mainIssue.code == 'invalid_union') {
      const unionErrors = mainIssue.unionErrors.sort(
        (error1: any, error2: any) =>
          error1.issues.length < error2.issues.length ? -1 : 1
      )
      console.error('Invalid component config', config)
      for (const issue of unionErrors[0].issues) {
        if ('expected' in issue) {
          console.error(
            `in key '${issue.path}': expected ${issue.expected}, got ${issue.received}`
          )
        }
      }
    } else {
      console.error(`Invalid component config encountered:`, config)
      console.error(parseResult.error.format())
    }
  }
}

export type ComponentConfig = z.infer<typeof ComponentConfigShape>
