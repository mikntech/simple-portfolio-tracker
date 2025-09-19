import { z } from 'zod';
import { publicProcedure, router } from '../trpc.js';
import { userRouter } from './user.js';

export const appRouter = router({
  // Health check endpoint
  health: publicProcedure.query(() => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  })),

  // Hello world endpoint
  hello: publicProcedure.input(z.object({ name: z.string().optional() })).query(({ input }) => {
    return {
      greeting: `Hello ${input.name || 'World'}!`,
    };
  }),

  // User subrouter
  user: userRouter,
});

export type AppRouter = typeof appRouter;
