import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { CreateUserSchema } from '@portfolio-tracker/shared-types';
import { createApiResponse } from '../../utils/lambda-handler';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body || '{}');
    const validated = CreateUserSchema.parse(body);

    // Check if email already exists
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

    if (existingUser.Items && existingUser.Items.length > 0) {
      return createApiResponse(409, {
        success: false,
        error: {
          code: 'EMAIL_EXISTS',
          message: 'User with this email already exists',
        },
      });
    }

    const user = {
      ...validated,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await docClient.send(
      new PutCommand({
        TableName: process.env.USERS_TABLE!,
        Item: user,
      })
    );

    // Automatically create a default portfolio for the user
    const portfolio = {
      id: uuidv4(),
      userId: user.id,
      name: 'My Portfolio',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await docClient.send(
      new PutCommand({
        TableName: process.env.PORTFOLIOS_TABLE!,
        Item: portfolio,
      })
    );

    return createApiResponse(201, {
      success: true,
      data: {
        ...user,
        createdAt: new Date(user.createdAt),
        updatedAt: new Date(user.updatedAt),
      },
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return createApiResponse(400, {
      success: false,
      error: {
        code: 'CREATE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to create user',
      },
    });
  }
};
