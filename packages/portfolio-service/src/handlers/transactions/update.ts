import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { CreateTransactionSchema } from '@portfolio-tracker/shared-types';
import { createApiResponse } from '../../utils/lambda-handler';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const transactionId = event.pathParameters?.id;
    const body = JSON.parse(event.body || '{}');

    if (!transactionId) {
      return createApiResponse(400, {
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Transaction ID is required',
        },
      });
    }

    const validated = CreateTransactionSchema.partial().parse(body);

    // If assetId is being updated, verify it exists
    if (validated.assetId) {
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
    }

    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    if (validated.assetId !== undefined) {
      updateExpressions.push('assetId = :assetId');
      expressionAttributeValues[':assetId'] = validated.assetId;
    }

    if (validated.type !== undefined) {
      updateExpressions.push('#type = :type');
      expressionAttributeNames['#type'] = 'type';
      expressionAttributeValues[':type'] = validated.type;
    }

    if (validated.quantity !== undefined) {
      updateExpressions.push('quantity = :quantity');
      expressionAttributeValues[':quantity'] = validated.quantity;
    }

    if (validated.price !== undefined) {
      updateExpressions.push('price = :price');
      expressionAttributeValues[':price'] = validated.price;
    }

    if (validated.executedAt !== undefined) {
      updateExpressions.push('executedAt = :executedAt');
      expressionAttributeValues[':executedAt'] = new Date(validated.executedAt).toISOString();
    }

    updateExpressions.push('updatedAt = :updatedAt');
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    const result = await docClient.send(
      new UpdateCommand({
        TableName: process.env.TRANSACTIONS_TABLE!,
        Key: { id: transactionId },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames:
          Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      })
    );

    return createApiResponse(200, {
      success: true,
      data: {
        ...result.Attributes,
        executedAt: result.Attributes!.executedAt
          ? new Date(result.Attributes!.executedAt)
          : undefined,
      },
    });
  } catch (error) {
    console.error('Error updating transaction:', error);
    return createApiResponse(500, {
      success: false,
      error: {
        code: 'UPDATE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to update transaction',
      },
    });
  }
};
