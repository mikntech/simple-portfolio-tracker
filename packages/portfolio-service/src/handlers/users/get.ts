import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { createApiResponse } from '../../utils/lambda-handler';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = event.pathParameters?.id;

    if (!userId) {
      return createApiResponse(400, {
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'User ID is required',
        },
      });
    }

    const result = await docClient.send(
      new GetCommand({
        TableName: process.env.USERS_TABLE!,
        Key: { id: userId },
      })
    );

    if (!result.Item) {
      return createApiResponse(404, {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    return createApiResponse(200, {
      success: true,
      data: {
        ...result.Item,
        createdAt: new Date(result.Item.createdAt),
        updatedAt: new Date(result.Item.updatedAt),
      },
    });
  } catch (error) {
    console.error('Error getting user:', error);
    return createApiResponse(500, {
      success: false,
      error: {
        code: 'GET_FAILED',
        message: error instanceof Error ? error.message : 'Failed to get user',
      },
    });
  }
};
