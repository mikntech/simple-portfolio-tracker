import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

export const dynamodb = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: false,
  },
});

export function getTableName(tableSuffix: string): string {
  const envVar = `${tableSuffix.toUpperCase()}_TABLE`;
  const tableName = process.env[envVar];

  if (!tableName) {
    throw new Error(`Environment variable ${envVar} is not set`);
  }

  return tableName;
}
