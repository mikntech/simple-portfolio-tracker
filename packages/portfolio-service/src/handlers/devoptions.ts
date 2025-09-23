import { createHandler } from '../utils/lambda-handler';

// Generic OPTIONS handler for all endpoints
export const handler = createHandler('dev', {}, async (context) => {
  console.log('[OPTIONS Lambda] Handler function body executed', {
    path: context.event.path,
    origin: context.event.headers.origin || context.event.headers.Origin,
    method: context.event.httpMethod,
  });

  // The createHandler function will automatically handle OPTIONS requests
  // This function body shouldn't actually execute for OPTIONS requests
  // as createHandler returns early for OPTIONS
  return {
    success: true,
    data: null,
  };
});
