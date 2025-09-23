import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { createApiResponse } from '../../utils/lambda-handler';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const symbol = event.pathParameters?.symbol;

    if (!symbol) {
      return createApiResponse(
        400,
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Symbol is required',
          },
        },
        event
      );
    }

    // Query by symbol using the GSI
    const result = await docClient.send(
      new QueryCommand({
        TableName: process.env.ASSETS_TABLE!,
        IndexName: 'symbol-index',
        KeyConditionExpression: 'symbol = :symbol',
        ExpressionAttributeValues: {
          ':symbol': symbol.toUpperCase(),
        },
      })
    );

    if (!result.Items || result.Items.length === 0) {
      return createApiResponse(
        404,
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Asset not found',
          },
        },
        event
      );
    }

    // Return the first item (symbols should be unique)
    return createApiResponse(
      200,
      {
        success: true,
        data: result.Items[0],
      },
      event
    );
  } catch (error) {
    console.error('Error getting asset by symbol:', error);
    return createApiResponse(
      500,
      {
        success: false,
        error: {
          code: 'GET_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get asset',
        },
      },
      event
    );
  }
};
