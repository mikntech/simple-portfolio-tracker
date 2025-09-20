import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { createApiResponse } from '../../utils/lambda-handler';
import type { Transaction } from '@portfolio-tracker/shared-types';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const {
      portfolioId,
      assetId,
      type,
      startDate,
      endDate,
      page = '1',
      limit = '20',
    } = event.queryStringParameters || {};

    if (!portfolioId) {
      return createApiResponse(400, {
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Portfolio ID is required',
        },
      });
    }

    const pageNum = parseInt(page, 10);
    const limitNum = Math.min(parseInt(limit, 10), 100);

    // Build query parameters
    let keyConditionExpression = 'portfolioId = :portfolioId';
    const expressionAttributeValues: Record<string, any> = {
      ':portfolioId': portfolioId,
    };

    // Use different index if filtering by assetId
    const queryParams: any = {
      TableName: process.env.TRANSACTIONS_TABLE!,
      Limit: limitNum,
    };

    if (assetId) {
      queryParams.IndexName = 'portfolioId-assetId-index';
      keyConditionExpression += ' AND assetId = :assetId';
      expressionAttributeValues[':assetId'] = assetId;
    } else {
      queryParams.IndexName = 'portfolioId-index';
    }

    // Add filters
    const filterExpressions: string[] = [];

    if (type) {
      filterExpressions.push('#type = :type');
      expressionAttributeValues[':type'] = type;
    }

    if (startDate) {
      filterExpressions.push('executedAt >= :startDate');
      expressionAttributeValues[':startDate'] = startDate;
    }

    if (endDate) {
      filterExpressions.push('executedAt <= :endDate');
      expressionAttributeValues[':endDate'] = endDate;
    }

    queryParams.KeyConditionExpression = keyConditionExpression;
    queryParams.ExpressionAttributeValues = expressionAttributeValues;

    if (filterExpressions.length > 0) {
      queryParams.FilterExpression = filterExpressions.join(' AND ');
      if (type) {
        queryParams.ExpressionAttributeNames = { '#type': 'type' };
      }
    }

    // Execute query
    const result = await docClient.send(new QueryCommand(queryParams));

    const transactions = (result.Items || []) as Transaction[];

    // Transform dates
    const transformedTransactions = transactions.map((t) => ({
      ...t,
      executedAt: t.executedAt ? new Date(t.executedAt) : undefined,
    }));

    // Simple pagination (in production, use LastEvaluatedKey)
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedTransactions = transformedTransactions.slice(startIndex, startIndex + limitNum);

    return createApiResponse(200, {
      success: true,
      data: {
        items: paginatedTransactions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: transactions.length,
          totalPages: Math.ceil(transactions.length / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('Error listing transactions:', error);
    return createApiResponse(500, {
      success: false,
      error: {
        code: 'LIST_FAILED',
        message: error instanceof Error ? error.message : 'Failed to list transactions',
      },
    });
  }
};
