import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  QueryCommand,
  BatchGetCommand,
  GetCommand,
} from '@aws-sdk/lib-dynamodb';
import { createApiResponse } from '../../utils/lambda-handler';
import type { Holding, Transaction, Asset } from '@portfolio-tracker/shared-types';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = event.pathParameters?.id;

    if (!userId) {
      return createApiResponse(
        400,
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'User ID is required',
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

    // Get all transactions for the user
    const transactionsResult = await docClient.send(
      new QueryCommand({
        TableName: process.env.TRANSACTIONS_TABLE!,
        IndexName: 'userId-index',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId,
        },
      })
    );

    const transactions = (transactionsResult.Items || []) as Transaction[];

    // Calculate holdings from transactions
    const holdingsMap = new Map<string, Holding>();

    for (const transaction of transactions) {
      const existing = holdingsMap.get(transaction.assetId) || {
        assetId: transaction.assetId,
        quantity: 0,
        totalCost: 0,
        averageCost: 0,
      };

      if (transaction.type === 'buy') {
        existing.quantity += transaction.quantity;
        existing.totalCost += transaction.quantity * transaction.price;
      } else if (transaction.type === 'sell') {
        // Calculate average cost before selling
        if (existing.quantity > 0) {
          existing.averageCost = existing.totalCost / existing.quantity;
        }
        existing.quantity -= transaction.quantity;
        existing.totalCost -= transaction.quantity * existing.averageCost;
      }

      // Recalculate average cost
      existing.averageCost = existing.quantity > 0 ? existing.totalCost / existing.quantity : 0;
      holdingsMap.set(transaction.assetId, existing);
    }

    // Filter out holdings with zero quantity
    const holdings = Array.from(holdingsMap.values()).filter((h) => h.quantity > 0);

    // Get asset details for holdings
    if (holdings.length > 0) {
      const assetIds = holdings.map((h) => ({ id: h.assetId }));
      const assetsResult = await docClient.send(
        new BatchGetCommand({
          RequestItems: {
            [process.env.ASSETS_TABLE!]: {
              Keys: assetIds,
            },
          },
        })
      );

      const assets = (assetsResult.Responses?.[process.env.ASSETS_TABLE!] || []) as Asset[];

      // For now, we'll use mock current prices
      // In a real implementation, this would fetch from a market data provider
      for (const holding of holdings) {
        const asset = assets.find((a) => a.id === holding.assetId);
        if (asset) {
          // Mock current price (in production, fetch from market data API)
          holding.currentPrice = holding.averageCost * (1 + (Math.random() * 0.4 - 0.2)); // ±20% variation
          holding.currentValue = holding.currentPrice * holding.quantity;
          holding.unrealizedGainLoss = holding.currentValue - holding.totalCost;
          holding.unrealizedGainLossPercent =
            (holding.unrealizedGainLoss / holding.totalCost) * 100;
        }
      }
    }

    return createApiResponse(
      200,
      {
        success: true,
        data: holdings,
      },
      event
    );
  } catch (error) {
    console.error('Error listing holdings:', error);
    return createApiResponse(
      500,
      {
        success: false,
        error: {
          code: 'LIST_FAILED',
          message: error instanceof Error ? error.message : 'Failed to list holdings',
        },
      },
      event
    );
  }
};
