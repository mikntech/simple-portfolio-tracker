import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { createApiResponse } from '../../utils/lambda-handler';
import type { Asset } from '@portfolio-tracker/shared-types';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// Mock data for common assets (in production, this would come from a real market data provider)
const MOCK_ASSETS: Asset[] = [
  { id: uuidv4(), symbol: 'AAPL', name: 'Apple Inc.' },
  { id: uuidv4(), symbol: 'GOOGL', name: 'Alphabet Inc. Class A' },
  { id: uuidv4(), symbol: 'MSFT', name: 'Microsoft Corporation' },
  { id: uuidv4(), symbol: 'AMZN', name: 'Amazon.com Inc.' },
  { id: uuidv4(), symbol: 'META', name: 'Meta Platforms Inc.' },
  { id: uuidv4(), symbol: 'TSLA', name: 'Tesla Inc.' },
  { id: uuidv4(), symbol: 'NVDA', name: 'NVIDIA Corporation' },
  { id: uuidv4(), symbol: 'BTC', name: 'Bitcoin' },
  { id: uuidv4(), symbol: 'ETH', name: 'Ethereum' },
  { id: uuidv4(), symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust' },
];

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const { q, type, exchange, limit = '50' } = event.queryStringParameters || {};

    if (!q || q.trim().length === 0) {
      return createApiResponse(400, {
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Search query is required',
        },
      });
    }

    const searchQuery = q.toLowerCase();
    const limitNum = Math.min(parseInt(limit, 10), 50);

    // First, check if assets already exist in the database
    const scanResult = await docClient.send(
      new ScanCommand({
        TableName: process.env.ASSETS_TABLE!,
        Limit: 1000, // Scan up to 1000 items
      })
    );

    let assets = (scanResult.Items || []) as Asset[];

    // If database is empty, populate with mock data
    if (assets.length === 0) {
      // Save mock assets to database
      for (const asset of MOCK_ASSETS) {
        await docClient.send(
          new PutCommand({
            TableName: process.env.ASSETS_TABLE!,
            Item: asset,
          })
        );
      }
      assets = MOCK_ASSETS;
    }

    // Filter assets based on search criteria
    let filteredAssets = assets.filter((asset) => {
      const symbolMatch = asset.symbol.toLowerCase().includes(searchQuery);
      const nameMatch = asset.name.toLowerCase().includes(searchQuery);
      return symbolMatch || nameMatch;
    });

    // Apply additional filters if provided
    if (type) {
      // In a real implementation, assets would have a type field
      // For now, we'll mock this based on symbol patterns
      filteredAssets = filteredAssets.filter((asset) => {
        if (type === 'crypto') {
          return ['BTC', 'ETH'].includes(asset.symbol);
        } else if (type === 'etf') {
          return asset.symbol === 'SPY';
        } else if (type === 'stock') {
          return !['BTC', 'ETH', 'SPY'].includes(asset.symbol);
        }
        return true;
      });
    }

    // Sort by relevance (exact symbol matches first, then symbol contains, then name contains)
    filteredAssets.sort((a, b) => {
      const aExactSymbol = a.symbol.toLowerCase() === searchQuery;
      const bExactSymbol = b.symbol.toLowerCase() === searchQuery;
      if (aExactSymbol && !bExactSymbol) return -1;
      if (!aExactSymbol && bExactSymbol) return 1;

      const aSymbolMatch = a.symbol.toLowerCase().startsWith(searchQuery);
      const bSymbolMatch = b.symbol.toLowerCase().startsWith(searchQuery);
      if (aSymbolMatch && !bSymbolMatch) return -1;
      if (!aSymbolMatch && bSymbolMatch) return 1;

      return a.symbol.localeCompare(b.symbol);
    });

    // Apply limit
    const paginatedAssets = filteredAssets.slice(0, limitNum);

    return createApiResponse(200, {
      success: true,
      data: paginatedAssets,
    });
  } catch (error) {
    console.error('Error searching assets:', error);
    return createApiResponse(500, {
      success: false,
      error: {
        code: 'SEARCH_FAILED',
        message: error instanceof Error ? error.message : 'Failed to search assets',
      },
    });
  }
};
