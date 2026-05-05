import { z } from 'zod';

export const TaskStatus = z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']);
export const Priority = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

export const taskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  status: TaskStatus.optional(),
  priority: Priority.optional(),
  dueDate: z.string().optional().nullable(),
  assigneeIds: z.array(z.string()).optional().nullable()
});

export const updateTaskSchema = taskSchema.partial();
