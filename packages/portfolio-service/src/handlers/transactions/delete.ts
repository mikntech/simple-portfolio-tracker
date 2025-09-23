import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { createApiResponse } from '../../utils/lambda-handler';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const transactionId = event.pathParameters?.id;

    if (!transactionId) {
      return createApiResponse(
        400,
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Transaction ID is required',
          },
        },
        event
      );
    }

    await docClient.send(
      new DeleteCommand({
        TableName: process.env.TRANSACTIONS_TABLE!,
        Key: { id: transactionId },
      })
    );

    return createApiResponse(
      200,
      {
        success: true,
        data: { message: 'Transaction deleted successfully' },
      },
      event
    );
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return createApiResponse(
      500,
      {
        success: false,
        error: {
          code: 'DELETE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to delete transaction',
        },
      },
      event
    );
  }
};
