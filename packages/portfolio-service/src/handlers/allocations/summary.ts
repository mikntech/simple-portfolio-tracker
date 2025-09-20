import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  QueryCommand,
  GetCommand,
  BatchGetCommand,
} from '@aws-sdk/lib-dynamodb';
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

    // Get portfolio
    const portfolioResult = await docClient.send(
      new GetCommand({
        TableName: process.env.PORTFOLIOS_TABLE!,
        Key: { id: portfolioId },
      })
    );

    if (!portfolioResult.Item) {
      return createApiResponse(404, {
        success: false,
        error: { code: 'PORTFOLIO_NOT_FOUND', message: 'Portfolio not found' },
      });
    }

    // Get allocations
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

    const allocations = allocationsResult.Items || [];

    // Get transactions to calculate current holdings
    const transactionsResult = await docClient.send(
      new QueryCommand({
        TableName: process.env.TRANSACTIONS_TABLE!,
        IndexName: 'portfolioId-executedAt-index',
        KeyConditionExpression: 'portfolioId = :portfolioId',
        ExpressionAttributeValues: {
          ':portfolioId': portfolioId,
        },
      })
    );

    const transactions = transactionsResult.Items || [];

    // Calculate current holdings
    const holdings = new Map<string, { quantity: number; totalCost: number }>();

    transactions.forEach((tx: any) => {
      const current = holdings.get(tx.assetId) || { quantity: 0, totalCost: 0 };

      if (tx.type === 'buy') {
        current.quantity += tx.quantity;
        current.totalCost += tx.quantity * tx.price + (tx.fee || 0);
      } else if (tx.type === 'sell') {
        const avgCost = current.totalCost / current.quantity;
        current.quantity -= tx.quantity;
        current.totalCost -= tx.quantity * avgCost;
      }

      holdings.set(tx.assetId, current);
    });

    // Get asset details
    const assetIds = [...new Set([...allocations.map((a: any) => a.assetId), ...holdings.keys()])];
    let assets: any[] = [];

    if (assetIds.length > 0) {
      const assetsResult = await docClient.send(
        new BatchGetCommand({
          RequestItems: {
            [process.env.ASSETS_TABLE!]: {
              Keys: assetIds.map((id) => ({ id })),
            },
          },
        })
      );
      assets = assetsResult.Responses?.[process.env.ASSETS_TABLE!] || [];
    }

    const assetMap = new Map(assets.map((a) => [a.id, a]));

    // Calculate portfolio value
    let totalValue = 0;
    holdings.forEach((holding, assetId) => {
      if (holding.quantity > 0) {
        // In production, you'd fetch current prices from a market data API
        const currentPrice = holding.totalCost / holding.quantity; // Using avg cost as placeholder
        totalValue += holding.quantity * currentPrice;
      }
    });

    // Build allocation summary
    const allocationSummary = allocations.map((allocation: any) => {
      const holding = holdings.get(allocation.assetId);
      const asset = assetMap.get(allocation.assetId);
      const currentValue = holding ? holding.quantity * (holding.totalCost / holding.quantity) : 0;
      const currentPercentage = totalValue > 0 ? (currentValue / totalValue) * 100 : 0;
      const targetValue = (allocation.targetPercentage / 100) * totalValue;
      const deviation = currentPercentage - allocation.targetPercentage;
      const rebalanceAmount = targetValue - currentValue;

      return {
        assetId: allocation.assetId,
        asset: asset || { id: allocation.assetId, symbol: 'Unknown', name: 'Unknown Asset' },
        targetPercentage: allocation.targetPercentage,
        currentPercentage,
        deviation,
        currentValue,
        targetValue,
        rebalanceAmount,
      };
    });

    const totalTargetPercentage = allocations.reduce(
      (sum: number, a: any) => sum + a.targetPercentage,
      0
    );

    return createApiResponse(200, {
      success: true,
      data: {
        portfolioId,
        allocations: allocationSummary,
        totalTargetPercentage,
        totalValue,
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error getting allocation summary:', error);
    return createApiResponse(500, {
      success: false,
      error: { code: 'SUMMARY_FAILED', message: 'Failed to get allocation summary' },
    });
  }
};
