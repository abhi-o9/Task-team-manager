import { z } from 'zod';

export const projectSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(500).optional()
});

export const updateProjectSchema = projectSchema.partial();
