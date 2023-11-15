import { z } from 'zod'
import path from 'path'

export const ManifestShape = z.object({
  name: z.string(),
  description: z.string(),
  allowCustomFields: z.oboolean(),
  permissions: z.record(
    z.object({ description: z.string(), required: z.boolean() })
  ),
})

export type Manifest = z.infer<typeof ManifestShape>

export function isManifest(obj: Record<string, unknown>): obj is Manifest {
  return ManifestShape.safeParse(obj).success
}

export function mockManifest(componentPath: string): Manifest {
  return {
    name: path.basename(componentPath),
    permissions: {},
    description: 'Imported from ' + componentPath,
    allowCustomFields: false,
  }
}
