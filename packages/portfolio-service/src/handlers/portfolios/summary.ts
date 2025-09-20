import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
  BatchGetCommand,
} from '@aws-sdk/lib-dynamodb';
import { createApiResponse } from '../../utils/lambda-handler';
import type { Holding, Transaction, Asset } from '@portfolio-tracker/shared-types';

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

    // Verify portfolio exists
    const portfolioResult = await docClient.send(
      new GetCommand({
        TableName: process.env.PORTFOLIOS_TABLE!,
        Key: { id: portfolioId },
      })
    );

    if (!portfolioResult.Item) {
      return createApiResponse(404, {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Portfolio not found',
        },
      });
    }

    // Get all transactions for the portfolio
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
        existing.quantity -= transaction.quantity;
        existing.totalCost -= transaction.quantity * existing.averageCost;
      }

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

      // For now, we'll use mock current prices since we don't have a price service
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

    // Calculate portfolio summary
    const totalCost = holdings.reduce((sum, h) => sum + h.totalCost, 0);
    const totalValue = holdings.reduce((sum, h) => sum + (h.currentValue || 0), 0);
    const totalGainLoss = totalValue - totalCost;
    const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

    const summary = {
      totalValue,
      totalCost,
      totalGainLoss,
      totalGainLossPercent,
      holdings,
      lastUpdated: new Date().toISOString(),
    };

    return createApiResponse(200, {
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('Error getting portfolio summary:', error);
    return createApiResponse(500, {
      success: false,
      error: {
        code: 'SUMMARY_FAILED',
        message: error instanceof Error ? error.message : 'Failed to get portfolio summary',
      },
    });
  }
};
