import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  DeleteCommand,
  QueryCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { createApiResponse } from '../../utils/lambda-handler';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const portfolioId = event.pathParameters?.id;

    if (!portfolioId) {
      return createApiResponse(400, {
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Portfolio ID is required',
        },
      });
    }

    // Delete the portfolio
    await docClient.send(
      new DeleteCommand({
        TableName: process.env.PORTFOLIOS_TABLE!,
        Key: { id: portfolioId },
      })
    );

    // Also delete related data (transactions and allocations)
    // Delete transactions
    const transactionsResult = await docClient.send(
      new QueryCommand({
        TableName: process.env.TRANSACTIONS_TABLE!,
        IndexName: 'portfolioId-index',
        KeyConditionExpression: 'portfolioId = :portfolioId',
        ExpressionAttributeValues: {
          ':portfolioId': portfolioId,
        },
      })
    );

    if (transactionsResult.Items && transactionsResult.Items.length > 0) {
      const deleteRequests = transactionsResult.Items.map((item) => ({
        DeleteRequest: {
          Key: { id: item.id },
        },
      }));

      // Batch delete in chunks of 25 (DynamoDB limit)
      for (let i = 0; i < deleteRequests.length; i += 25) {
        const chunk = deleteRequests.slice(i, i + 25);
        await docClient.send(
          new BatchWriteCommand({
            RequestItems: {
              [process.env.TRANSACTIONS_TABLE!]: chunk,
            },
          })
        );
      }
    }

    // Delete allocations
    const allocationsResult = await docClient.send(
      new QueryCommand({
        TableName: process.env.ALLOCATIONS_TABLE!,
        IndexName: 'portfolioId-index',
        KeyConditionExpression: 'portfolioId = :portfolioId',
        ExpressionAttributeValues: {
          ':portfolioId': portfolioId,
        },
      })
    );

    if (allocationsResult.Items && allocationsResult.Items.length > 0) {
      const deleteRequests = allocationsResult.Items.map((item) => ({
        DeleteRequest: {
          Key: { id: item.id },
        },
      }));

      for (let i = 0; i < deleteRequests.length; i += 25) {
        const chunk = deleteRequests.slice(i, i + 25);
        await docClient.send(
          new BatchWriteCommand({
            RequestItems: {
              [process.env.ALLOCATIONS_TABLE!]: chunk,
            },
          })
        );
      }
    }

    return createApiResponse(200, {
      success: true,
      data: { message: 'Portfolio deleted successfully' },
    });
  } catch (error) {
    console.error('Error deleting portfolio:', error);
    return createApiResponse(500, {
      success: false,
      error: {
        code: 'DELETE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to delete portfolio',
      },
    });
  }
};
