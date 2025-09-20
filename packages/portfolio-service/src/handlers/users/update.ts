import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { CreateUserSchema } from '@portfolio-tracker/shared-types';
import { createApiResponse } from '../../utils/lambda-handler';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = event.pathParameters?.id;
    const body = JSON.parse(event.body || '{}');

    if (!userId) {
      return createApiResponse(400, {
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'User ID is required',
        },
      });
    }

    const validated = CreateUserSchema.partial().parse(body);

    // If email is being updated, check if it already exists
    if (validated.email) {
      const existingUser = await docClient.send(
        new QueryCommand({
          TableName: process.env.USERS_TABLE!,
          IndexName: 'email-index',
          KeyConditionExpression: 'email = :email',
          ExpressionAttributeValues: {
            ':email': validated.email,
          },
        })
      );

      if (
        existingUser.Items &&
        existingUser.Items.length > 0 &&
        existingUser.Items[0].id !== userId
      ) {
        return createApiResponse(409, {
          success: false,
          error: {
            code: 'EMAIL_EXISTS',
            message: 'User with this email already exists',
          },
        });
      }
    }

    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    if (validated.name !== undefined) {
      updateExpressions.push('#name = :name');
      expressionAttributeNames['#name'] = 'name';
      expressionAttributeValues[':name'] = validated.name;
    }

    if (validated.email !== undefined) {
      updateExpressions.push('email = :email');
      expressionAttributeValues[':email'] = validated.email;
    }

    updateExpressions.push('updatedAt = :updatedAt');
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    const result = await docClient.send(
      new UpdateCommand({
        TableName: process.env.USERS_TABLE!,
        Key: { id: userId },
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
        createdAt: new Date(result.Attributes!.createdAt),
        updatedAt: new Date(result.Attributes!.updatedAt),
      },
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return createApiResponse(500, {
      success: false,
      error: {
        code: 'UPDATE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to update user',
      },
    });
  }
};
