import { createHandler } from '../utils/lambda-handler';

// Generic OPTIONS handler for all endpoints
export const handler = createHandler({}, async () => {
  // The createHandler function will automatically handle OPTIONS requests
  return {
    success: true,
    data: null,
  };
});
