import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { UpdateAllocationSchema } from '@portfolio-tracker/shared-types';
import { createApiResponse } from '../../utils/lambda-handler';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const id = event.pathParameters?.id;
    if (!id) {
      return createApiResponse(400, {
        success: false,
        error: { code: 'MISSING_ID', message: 'Allocation ID is required' },
      });
    }

    const body = JSON.parse(event.body || '{}');
    const validated = UpdateAllocationSchema.parse(body);

    const result = await docClient.send(
      new UpdateCommand({
        TableName: process.env.ALLOCATIONS_TABLE!,
        Key: { id },
        UpdateExpression: 'SET targetPercentage = :targetPercentage, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':targetPercentage': validated.targetPercentage,
          ':updatedAt': new Date().toISOString(),
        },
        ReturnValues: 'ALL_NEW',
      })
    );

    return createApiResponse(200, { success: true, data: result.Attributes });
  } catch (error) {
    console.error('Error updating allocation:', error);
    return createApiResponse(400, {
      success: false,
      error: {
        code: 'UPDATE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to update allocation',
      },
    });
  }
};
