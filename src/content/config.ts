import { z, defineCollection } from 'astro:content';

const chatsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    tldr: z.string().optional(),
    action_items: z.array(
      z.object({
        task: z.string(),
        done: z.boolean().default(false),
      })
    ).default([]),
  }),
});

const plansCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    tldr: z.string().optional(),
    icon: z.string().optional(),
    duration: z.string().optional(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    milestones: z.array(
      z.object({
        title: z.string(),
        weeks: z.string(),
        status: z.enum(['not-started', 'in-progress', 'complete']).default('not-started'),
      })
    ).default([]),
  }),
});

export const collections = {
  chats: chatsCollection,
  plans: plansCollection,
};
