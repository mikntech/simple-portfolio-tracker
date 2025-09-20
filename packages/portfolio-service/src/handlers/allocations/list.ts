import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { createApiResponse } from '../../utils/lambda-handler';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const portfolioId = event.pathParameters?.portfolioId;

    if (!portfolioId) {
      return createApiResponse(400, {
        success: false,
        error: { code: 'MISSING_PORTFOLIO_ID', message: 'Portfolio ID is required' },
      });
    }

    const result = await docClient.send(
      new QueryCommand({
        TableName: process.env.ALLOCATIONS_TABLE!,
        IndexName: 'portfolioId-index',
        KeyConditionExpression: 'portfolioId = :portfolioId',
        ExpressionAttributeValues: {
          ':portfolioId': portfolioId,
        },
      })
    );

    return createApiResponse(200, { success: true, data: result.Items || [] });
  } catch (error) {
    console.error('Error listing allocations:', error);
    return createApiResponse(500, {
      success: false,
      error: { code: 'LIST_FAILED', message: 'Failed to list allocations' },
    });
  }
};
