import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { createApiResponse } from '../../utils/lambda-handler';
import type { Holding, Transaction, Asset } from '@portfolio-tracker/shared-types';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = event.pathParameters?.id;
    const assetId = event.pathParameters?.assetId;

    if (!userId || !assetId) {
      return createApiResponse(
        400,
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'User ID and Asset ID are required',
          },
        },
        event
      );
    }

    // Verify user exists
    const userResult = await docClient.send(
      new GetCommand({
        TableName: process.env.USERS_TABLE!,
        Key: { id: userId },
      })
    );

    if (!userResult.Item) {
      return createApiResponse(
        404,
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'User not found',
          },
        },
        event
      );
    }

    // Get asset details
    const assetResult = await docClient.send(
      new GetCommand({
        TableName: process.env.ASSETS_TABLE!,
        Key: { id: assetId },
      })
    );

    if (!assetResult.Item) {
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

    const asset = assetResult.Item as Asset;

    // Get transactions for this specific asset in the portfolio
    const transactionsResult = await docClient.send(
      new QueryCommand({
        TableName: process.env.TRANSACTIONS_TABLE!,
        IndexName: 'userId-assetId-index',
        KeyConditionExpression: 'userId = :userId AND assetId = :assetId',
        ExpressionAttributeValues: {
          ':userId': userId,
          ':assetId': assetId,
        },
      })
    );

    const transactions = (transactionsResult.Items || []) as Transaction[];

    // Calculate holding from transactions
    let holding: Holding = {
      assetId: assetId,
      quantity: 0,
      totalCost: 0,
      averageCost: 0,
    };

    for (const transaction of transactions) {
      if (transaction.type === 'buy') {
        holding.quantity += transaction.quantity;
        holding.totalCost += transaction.quantity * transaction.price;
      } else if (transaction.type === 'sell') {
        // Calculate average cost before selling
        if (holding.quantity > 0) {
          holding.averageCost = holding.totalCost / holding.quantity;
        }
        holding.quantity -= transaction.quantity;
        holding.totalCost -= transaction.quantity * holding.averageCost;
      }
    }

    // Recalculate average cost
    holding.averageCost = holding.quantity > 0 ? holding.totalCost / holding.quantity : 0;

    // If no position, return 404
    if (holding.quantity === 0) {
      return createApiResponse(
        404,
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'No holding found for this asset',
          },
        },
        event
      );
    }

    // Mock current price (in production, fetch from market data API)
    holding.currentPrice = holding.averageCost * (1 + (Math.random() * 0.4 - 0.2)); // ±20% variation
    holding.currentValue = holding.currentPrice * holding.quantity;
    holding.unrealizedGainLoss = holding.currentValue - holding.totalCost;
    holding.unrealizedGainLossPercent = (holding.unrealizedGainLoss / holding.totalCost) * 100;

    return createApiResponse(
      200,
      {
        success: true,
        data: holding,
      },
      event
    );
  } catch (error) {
    console.error('Error getting holding:', error);
    return createApiResponse(
      500,
      {
        success: false,
        error: {
          code: 'GET_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get holding',
        },
      },
      event
    );
  }
};
