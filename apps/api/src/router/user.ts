import { z } from 'zod';
import { publicProcedure, router } from '../trpc.js';

// Mock user data
const users = [
  { id: '1', name: 'John Doe', email: 'john@example.com' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
];

export const userRouter = router({
  // Get all users
  list: publicProcedure.query(() => {
    return users;
  }),

  // Get user by ID
  byId: publicProcedure.input(z.object({ id: z.string() })).query(({ input }) => {
    const user = users.find((u) => u.id === input.id);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }),

  // Create a new user
  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
      })
    )
    .mutation(({ input }) => {
      const newUser = {
        id: String(users.length + 1),
        ...input,
      };
      users.push(newUser);
      return newUser;
    }),
});
