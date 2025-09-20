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

    // Delete user
    await docClient.send(
      new DeleteCommand({
        TableName: process.env.USERS_TABLE!,
        Key: { id: userId },
      })
    );

    // Delete user's portfolios and related data
    const portfoliosResult = await docClient.send(
      new QueryCommand({
        TableName: process.env.PORTFOLIOS_TABLE!,
        IndexName: 'userId-index',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId,
        },
      })
    );

    if (portfoliosResult.Items && portfoliosResult.Items.length > 0) {
      // Delete portfolios
      const deleteRequests = portfoliosResult.Items.map((item) => ({
        DeleteRequest: {
          Key: { id: item.id },
        },
      }));

      for (let i = 0; i < deleteRequests.length; i += 25) {
        const chunk = deleteRequests.slice(i, i + 25);
        await docClient.send(
          new BatchWriteCommand({
            RequestItems: {
              [process.env.PORTFOLIOS_TABLE!]: chunk,
            },
          })
        );
      }

      // Delete related transactions and allocations for each portfolio
      for (const portfolio of portfoliosResult.Items) {
        // Delete transactions
        const transactionsResult = await docClient.send(
          new QueryCommand({
            TableName: process.env.TRANSACTIONS_TABLE!,
            IndexName: 'portfolioId-index',
            KeyConditionExpression: 'portfolioId = :portfolioId',
            ExpressionAttributeValues: {
              ':portfolioId': portfolio.id,
            },
          })
        );

        if (transactionsResult.Items && transactionsResult.Items.length > 0) {
          const transactionDeletes = transactionsResult.Items.map((item) => ({
            DeleteRequest: { Key: { id: item.id } },
          }));

          for (let i = 0; i < transactionDeletes.length; i += 25) {
            const chunk = transactionDeletes.slice(i, i + 25);
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
              ':portfolioId': portfolio.id,
            },
          })
        );

        if (allocationsResult.Items && allocationsResult.Items.length > 0) {
          const allocationDeletes = allocationsResult.Items.map((item) => ({
            DeleteRequest: { Key: { id: item.id } },
          }));

          for (let i = 0; i < allocationDeletes.length; i += 25) {
            const chunk = allocationDeletes.slice(i, i + 25);
            await docClient.send(
              new BatchWriteCommand({
                RequestItems: {
                  [process.env.ALLOCATIONS_TABLE!]: chunk,
                },
              })
            );
          }
        }
      }
    }

    return createApiResponse(200, {
      success: true,
      data: { message: 'User and related data deleted successfully' },
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return createApiResponse(500, {
      success: false,
      error: {
        code: 'DELETE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to delete user',
      },
    });
  }
};
