import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { createApiResponse } from '../../utils/lambda-handler';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const portfolioId = event.pathParameters?.id;
    const body = JSON.parse(event.body || '{}');

    if (!portfolioId) {
      return createApiResponse(400, {
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Portfolio ID is required',
        },
      });
    }

    const { name } = body;

    if (!name) {
      return createApiResponse(400, {
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Name is required',
        },
      });
    }

    const result = await docClient.send(
      new UpdateCommand({
        TableName: process.env.PORTFOLIOS_TABLE!,
        Key: { id: portfolioId },
        UpdateExpression: 'SET #name = :name, updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#name': 'name',
        },
        ExpressionAttributeValues: {
          ':name': name,
          ':updatedAt': new Date().toISOString(),
        },
        ReturnValues: 'ALL_NEW',
      })
    );

    return createApiResponse(200, {
      success: true,
      data: result.Attributes,
    });
  } catch (error) {
    console.error('Error updating portfolio:', error);
    return createApiResponse(500, {
      success: false,
      error: {
        code: 'UPDATE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to update portfolio',
      },
    });
  }
};
