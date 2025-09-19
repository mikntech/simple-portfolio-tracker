import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@template/api';

export const trpc = createTRPCReact<AppRouter>();
