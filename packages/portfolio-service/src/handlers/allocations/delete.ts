import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { createApiResponse } from '../../utils/lambda-handler';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const id = event.pathParameters?.id;
    if (!id) {
      return createApiResponse(
        400,
        {
          success: false,
          error: { code: 'MISSING_ID', message: 'Allocation ID is required' },
        },
        event
      );
    }

    await docClient.send(
      new DeleteCommand({
        TableName: process.env.ALLOCATIONS_TABLE!,
        Key: { id },
      })
    );

    return createApiResponse(
      200,
      {
        success: true,
        data: { message: 'Allocation deleted successfully' },
      },
      event
    );
  } catch (error) {
    console.error('Error deleting allocation:', error);
    return createApiResponse(
      500,
      {
        success: false,
        error: { code: 'DELETE_FAILED', message: 'Failed to delete allocation' },
      },
      event
    );
  }
};
