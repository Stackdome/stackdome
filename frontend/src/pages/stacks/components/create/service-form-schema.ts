import { z } from "zod"

/**
 * The service step of the repository journey.
 *
 * Restored, not rewritten. It shipped as `wizard/git-source-form-schema.ts` and
 * was deleted with the wizard it belonged to — but the STEP it validates was
 * never replaced, so the deletion took the only thing standing between a typo
 * and a draft that cannot build. The rules are the ones that were there.
 *
 * `dockerfilePath` and `buildContext` are optional: `buildGitSeed` falls back to
 * "Dockerfile" / "." when they are blank, matching the API's own defaults.
 */
export const serviceFormSchema = z.object({
  serviceName: z.string().trim().min(1, "Service name is required."),
  branch: z.string().trim().min(1, "Branch is required."),
  port: z
    .string()
    .trim()
    .min(1, "Port is required.")
    .regex(/^\d+$/, "Port must be a whole number.")
    .refine((v) => Number(v) > 0 && Number(v) < 65536, "Port must be between 1 and 65535."),
  dockerfilePath: z.string().trim().optional(),
  buildContext: z.string().trim().optional(),
})
