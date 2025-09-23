import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { z } from 'zod';
import { ApiResponse } from '@portfolio-tracker/shared-types';

export type LambdaHandler = (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;

export interface HandlerOptions<TBody = any, TParams = any, TQuery = any> {
  bodySchema?: z.ZodType<TBody>;
  paramsSchema?: z.ZodType<TParams>;
  querySchema?: z.ZodType<TQuery>;
}

export interface HandlerContext<TBody = any, TParams = any, TQuery = any> {
  event: APIGatewayProxyEvent;
  body?: TBody;
  params?: TParams;
  query?: TQuery;
}

export function createHandler<TBody = any, TParams = any, TQuery = any>(
  stage: string,
  options: HandlerOptions<TBody, TParams, TQuery>,
  handler: (context: HandlerContext<TBody, TParams, TQuery>) => Promise<ApiResponse<any>>
): LambdaHandler {
  return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    // Get the origin from the request
    const origin = event.headers?.origin || event.headers?.Origin || '';

    // List of allowed origins
    const allowedOrigins = [
      'https://app.keeride.com',
      'https://devapp.keeride.com',
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:3001',
    ];

    // Use the requesting origin if it's allowed, otherwise use the first allowed origin
    const corsOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers':
        'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    };

    // Note: OPTIONS requests are now handled by API Gateway Mock integrations
    // This code should not be reached, but keeping as a fallback
    if (event.httpMethod === 'OPTIONS') {
      console.log(
        '[WARNING] OPTIONS request reached Lambda handler - should be handled by API Gateway',
        {
          origin,
          corsOrigin,
          path: event.path,
        }
      );
      return {
        statusCode: 200,
        headers,
        body: '',
      };
    }

    try {
      const context: HandlerContext<TBody, TParams, TQuery> = { event };

      // Parse and validate body
      if (options.bodySchema && event.body) {
        try {
          const parsedBody = JSON.parse(event.body);
          context.body = options.bodySchema.parse(parsedBody);
        } catch (error) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              success: false,
              error: {
                code: 'INVALID_REQUEST_BODY',
                message: 'Invalid request body',
                details: error instanceof z.ZodError ? error.errors : error,
              },
            } as ApiResponse<never>),
          };
        }
      }

      // Parse and validate path parameters
      if (options.paramsSchema && event.pathParameters) {
        try {
          context.params = options.paramsSchema.parse(event.pathParameters);
        } catch (error) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              success: false,
              error: {
                code: 'INVALID_PATH_PARAMETERS',
                message: 'Invalid path parameters',
                details: error instanceof z.ZodError ? error.errors : error,
              },
            } as ApiResponse<never>),
          };
        }
      }

      // Parse and validate query parameters
      if (options.querySchema && event.queryStringParameters) {
        try {
          // Convert numeric strings to numbers for validation
          const processedQuery = Object.entries(event.queryStringParameters).reduce(
            (acc, [key, value]) => {
              if (value && !isNaN(Number(value)) && value !== '') {
                acc[key] = Number(value);
              } else {
                acc[key] = value;
              }
              return acc;
            },
            {} as Record<string, any>
          );
          context.query = options.querySchema.parse(processedQuery);
        } catch (error) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              success: false,
              error: {
                code: 'INVALID_QUERY_PARAMETERS',
                message: 'Invalid query parameters',
                details: error instanceof z.ZodError ? error.errors : error,
              },
            } as ApiResponse<never>),
          };
        }
      }

      // Execute handler
      const response = await handler(context);

      // Return response
      return {
        statusCode: response.success ? 200 : 400,
        headers,
        body: JSON.stringify(response),
      };
    } catch (error) {
      console.error('Handler error:', error);

      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An unexpected error occurred',
            details: process.env.STAGE === 'dev' ? error : undefined,
          },
        } as ApiResponse<never>),
      };
    }
  };
}

export class BusinessError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'BusinessError';
  }
}

export function handleBusinessError(error: unknown): ApiResponse<never> {
  if (error instanceof BusinessError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    };
  }

  throw error;
}

export function createApiResponse<T>(
  statusCode: number,
  body: ApiResponse<T>,
  event?: APIGatewayProxyEvent
): APIGatewayProxyResult {
  // Get the origin from the request
  const origin = event?.headers?.origin || event?.headers?.Origin || 'https://app.keeride.com';

  // List of allowed origins
  const allowedOrigins = [
    'https://app.keeride.com',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:3001',
  ];
  const corsOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers':
        'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    },
    body: JSON.stringify(body),
  };
}
