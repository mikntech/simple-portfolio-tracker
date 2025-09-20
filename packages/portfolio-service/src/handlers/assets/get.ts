import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { createApiResponse } from '../../utils/lambda-handler';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const assetId = event.pathParameters?.id;

    if (!assetId) {
      return createApiResponse(400, {
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Asset ID is required',
        },
      });
    }

    const result = await docClient.send(
      new GetCommand({
        TableName: process.env.ASSETS_TABLE!,
        Key: { id: assetId },
      })
    );

    if (!result.Item) {
      return createApiResponse(404, {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Asset not found',
        },
      });
    }

    return createApiResponse(200, {
      success: true,
      data: result.Item,
    });
  } catch (error) {
    console.error('Error getting asset:', error);
    return createApiResponse(500, {
      success: false,
      error: {
        code: 'GET_FAILED',
        message: error instanceof Error ? error.message : 'Failed to get asset',
      },
    });
  }
};
