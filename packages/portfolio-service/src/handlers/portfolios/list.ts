import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { createApiResponse } from '../../utils/lambda-handler';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = event.queryStringParameters?.userId;

    if (!userId) {
      return createApiResponse(400, {
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'User ID is required',
        },
      });
    }

    // Query portfolios by user ID
    const result = await docClient.send(
      new QueryCommand({
        TableName: process.env.PORTFOLIOS_TABLE!,
        IndexName: 'userId-index',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId,
        },
      })
    );

    return createApiResponse(200, {
      success: true,
      data: result.Items || [],
    });
  } catch (error) {
    console.error('Error listing portfolios:', error);
    return createApiResponse(500, {
      success: false,
      error: {
        code: 'LIST_FAILED',
        message: error instanceof Error ? error.message : 'Failed to list portfolios',
      },
    });
  }
};
