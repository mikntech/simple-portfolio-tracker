import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { CreateTransactionSchema } from '@portfolio-tracker/shared-types';
import { createApiResponse } from '../../utils/lambda-handler';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body || '{}');
    const validated = CreateTransactionSchema.parse(body);

    // Validate that the asset exists
    const assetResult = await docClient.send(
      new GetCommand({
        TableName: process.env.ASSETS_TABLE!,
        Key: { id: validated.assetId },
      })
    );

    if (!assetResult.Item) {
      return createApiResponse(404, {
        success: false,
        error: {
          code: 'ASSET_NOT_FOUND',
          message: 'Asset not found',
        },
      });
    }

    // For simplified backend, derive portfolioId from the request
    const portfolioId = body.portfolioId;
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
          code: 'PORTFOLIO_NOT_FOUND',
          message: 'Portfolio not found',
        },
      });
    }

    const transaction = {
      ...validated,
      id: uuidv4(),
      portfolioId,
      executedAt: validated.executedAt
        ? new Date(validated.executedAt).toISOString()
        : new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await docClient.send(
      new PutCommand({
        TableName: process.env.TRANSACTIONS_TABLE!,
        Item: transaction,
      })
    );

    return createApiResponse(201, {
      success: true,
      data: {
        ...transaction,
        executedAt: transaction.executedAt ? new Date(transaction.executedAt) : undefined,
      },
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    return createApiResponse(400, {
      success: false,
      error: {
        code: 'CREATE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to create transaction',
      },
    });
  }
};
