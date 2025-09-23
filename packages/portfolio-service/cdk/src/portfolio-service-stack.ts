import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as logs from 'aws-cdk-lib/aws-logs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import * as path from 'path';

export interface PortfolioServiceStackProps extends cdk.StackProps {
  stage: string;
}

export class PortfolioServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: PortfolioServiceStackProps) {
    super(scope, id, props);

    const { stage } = props;

    const apiGatewayId = ssm.StringParameter.valueForStringParameter(
      this,
      '/portfolio-tracker/base/api-gateway-id' + stage
    );
    const apiGatewayRootResourceId = ssm.StringParameter.valueForStringParameter(
      this,
      '/portfolio-tracker/base/api-gateway-root-resource-id' + stage
    );

    const api = apigateway.RestApi.fromRestApiAttributes(this, 'ApiGateway', {
      restApiId: apiGatewayId,
      rootResourceId: apiGatewayRootResourceId,
    });

    const usersTable = new dynamodb.Table(this, 'UsersTable', {
      tableName: `pt2-users-${stage}`,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    usersTable.addGlobalSecondaryIndex({
      indexName: 'email-index',
      partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
    });

    const portfoliosTable = new dynamodb.Table(this, 'PortfoliosTable', {
      tableName: `pt2-portfolios-${stage}`,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    portfoliosTable.addGlobalSecondaryIndex({
      indexName: 'userId-index',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
    });

    const allocationsTable = new dynamodb.Table(this, 'AllocationsTable', {
      tableName: `pt2-allocations-${stage}`,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    allocationsTable.addGlobalSecondaryIndex({
      indexName: 'portfolioId-index',
      partitionKey: { name: 'portfolioId', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const assetsTable = new dynamodb.Table(this, 'AssetsTable', {
      tableName: `pt2-assets-${stage}`,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    assetsTable.addGlobalSecondaryIndex({
      indexName: 'symbol-index',
      partitionKey: { name: 'symbol', type: dynamodb.AttributeType.STRING },
    });

    const transactionsTable = new dynamodb.Table(this, 'TransactionsTable', {
      tableName: `pt2-transactions-${stage}`,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    transactionsTable.addGlobalSecondaryIndex({
      indexName: 'portfolioId-index',
      partitionKey: { name: 'portfolioId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'executedAt', type: dynamodb.AttributeType.STRING },
    });

    transactionsTable.addGlobalSecondaryIndex({
      indexName: 'portfolioId-assetId-index',
      partitionKey: { name: 'portfolioId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'assetId', type: dynamodb.AttributeType.STRING },
    });

    const commonEnv = {
      STAGE: stage,
      USERS_TABLE: usersTable.tableName,
      PORTFOLIOS_TABLE: portfoliosTable.tableName,
      ASSETS_TABLE: assetsTable.tableName,
      TRANSACTIONS_TABLE: transactionsTable.tableName,
      ALLOCATIONS_TABLE: allocationsTable.tableName,
      LOG_LEVEL: 'INFO',
    };

    const functionDefaults = {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      environment: commonEnv,
      memorySize: 512,
      timeout: cdk.Duration.seconds(30),
      bundling: {
        externalModules: ['aws-sdk'],
        minify: true,
        sourceMap: true,
      },
    };

    // Helper function to create Lambda with log group
    const createLambdaFunction = (id: string, props: any): NodejsFunction => {
      const func = new NodejsFunction(this, id, {
        ...functionDefaults,
        ...props,
      });

      // Create log group with retention
      new logs.LogGroup(this, `${id}LogGroup`, {
        logGroupName: `/aws/lambda/${props.functionName}`,
        retention: logs.RetentionDays.ONE_WEEK,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      });

      return func;
    };

    // Create a reusable OPTIONS method configuration for CORS
    const optionsIntegration = new apigateway.MockIntegration({
      integrationResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Headers':
              "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
            'method.response.header.Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,OPTIONS'",
            'method.response.header.Access-Control-Allow-Origin': "'*'",
            'method.response.header.Access-Control-Allow-Credentials': "'true'",
          },
        },
      ],
      passthroughBehavior: apigateway.PassthroughBehavior.NEVER,
      requestTemplates: {
        'application/json': '{"statusCode": 200}',
      },
    });

    const optionsMethodResponse = {
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Headers': true,
            'method.response.header.Access-Control-Allow-Methods': true,
            'method.response.header.Access-Control-Allow-Origin': true,
            'method.response.header.Access-Control-Allow-Credentials': true,
          },
        },
      ],
    };

    const userHandlers = {
      create: createLambdaFunction('CreateUserFunction', {
        entry: path.join(__dirname, '../../src/handlers/users/create.ts'),
        functionName: `pt2-create-user-${stage}`,
      }),
      get: createLambdaFunction('GetUserFunction', {
        entry: path.join(__dirname, '../../src/handlers/users/get.ts'),
        functionName: `pt2-get-user-${stage}`,
      }),
      update: createLambdaFunction('UpdateUserFunction', {
        entry: path.join(__dirname, '../../src/handlers/users/update.ts'),
        functionName: `pt2-update-user-${stage}`,
      }),
      delete: createLambdaFunction('DeleteUserFunction', {
        entry: path.join(__dirname, '../../src/handlers/users/delete.ts'),
        functionName: `pt2-delete-user-${stage}`,
      }),
    };

    const portfolioHandlers = {
      create: createLambdaFunction('CreatePortfolioFunction', {
        entry: path.join(__dirname, '../../src/handlers/portfolios/create.ts'),
        functionName: `pt2-create-portfolio-${stage}`,
      }),
      get: createLambdaFunction('GetPortfolioFunction', {
        entry: path.join(__dirname, '../../src/handlers/portfolios/get.ts'),
        functionName: `pt2-get-portfolio-${stage}`,
      }),
      list: createLambdaFunction('ListPortfoliosFunction', {
        entry: path.join(__dirname, '../../src/handlers/portfolios/list.ts'),
        functionName: `pt2-list-portfolios-${stage}`,
      }),
      update: createLambdaFunction('UpdatePortfolioFunction', {
        entry: path.join(__dirname, '../../src/handlers/portfolios/update.ts'),
        functionName: `pt2-update-portfolio-${stage}`,
      }),
      delete: createLambdaFunction('DeletePortfolioFunction', {
        entry: path.join(__dirname, '../../src/handlers/portfolios/delete.ts'),
        functionName: `pt2-delete-portfolio-${stage}`,
      }),
      summary: createLambdaFunction('PortfolioSummaryFunction', {
        entry: path.join(__dirname, '../../src/handlers/portfolios/summary.ts'),
        functionName: `pt2-portfolio-summary-${stage}`,
        timeout: cdk.Duration.minutes(1),
      }),
    };

    const transactionHandlers = {
      create: createLambdaFunction('CreateTransactionFunction', {
        entry: path.join(__dirname, '../../src/handlers/transactions/create.ts'),
        functionName: `pt2-create-transaction-${stage}`,
      }),
      get: createLambdaFunction('GetTransactionFunction', {
        entry: path.join(__dirname, '../../src/handlers/transactions/get.ts'),
        functionName: `pt2-get-transaction-${stage}`,
      }),
      list: createLambdaFunction('ListTransactionsFunction', {
        entry: path.join(__dirname, '../../src/handlers/transactions/list.ts'),
        functionName: `pt2-list-transactions-${stage}`,
      }),
      update: createLambdaFunction('UpdateTransactionFunction', {
        entry: path.join(__dirname, '../../src/handlers/transactions/update.ts'),
        functionName: `pt2-update-transaction-${stage}`,
      }),
      delete: createLambdaFunction('DeleteTransactionFunction', {
        entry: path.join(__dirname, '../../src/handlers/transactions/delete.ts'),
        functionName: `pt2-delete-transaction-${stage}`,
      }),
    };

    const assetHandlers = {
      search: createLambdaFunction('SearchAssetsFunction', {
        entry: path.join(__dirname, '../../src/handlers/assets/search.ts'),
        functionName: `pt2-search-assets-${stage}`,
      }),
      get: createLambdaFunction('GetAssetFunction', {
        entry: path.join(__dirname, '../../src/handlers/assets/get.ts'),
        functionName: `pt2-get-asset-${stage}`,
      }),
      getBySymbol: createLambdaFunction('GetAssetBySymbolFunction', {
        entry: path.join(__dirname, '../../src/handlers/assets/get-by-symbol.ts'),
        functionName: `pt2-get-asset-by-symbol-${stage}`,
      }),
    };

    const holdingHandlers = {
      list: createLambdaFunction('ListHoldingsFunction', {
        entry: path.join(__dirname, '../../src/handlers/holdings/list.ts'),
        functionName: `pt2-list-holdings-${stage}`,
      }),
      get: createLambdaFunction('GetHoldingFunction', {
        entry: path.join(__dirname, '../../src/handlers/holdings/get.ts'),
        functionName: `pt2-get-holding-${stage}`,
      }),
    };

    const allocationHandlers = {
      create: createLambdaFunction('CreateAllocationFunction', {
        entry: path.join(__dirname, '../../src/handlers/allocations/create.ts'),
        functionName: `pt2-create-allocation-${stage}`,
      }),
      list: createLambdaFunction('ListAllocationsFunction', {
        entry: path.join(__dirname, '../../src/handlers/allocations/list.ts'),
        functionName: `pt2-list-allocations-${stage}`,
      }),
      update: createLambdaFunction('UpdateAllocationFunction', {
        entry: path.join(__dirname, '../../src/handlers/allocations/update.ts'),
        functionName: `pt2-update-allocation-${stage}`,
      }),
      delete: createLambdaFunction('DeleteAllocationFunction', {
        entry: path.join(__dirname, '../../src/handlers/allocations/delete.ts'),
        functionName: `pt2-delete-allocation-${stage}`,
      }),
      summary: createLambdaFunction('GetAllocationSummaryFunction', {
        entry: path.join(__dirname, '../../src/handlers/allocations/summary.ts'),
        functionName: `pt2-allocation-summary-${stage}`,
      }),
    };

    usersTable.grantReadWriteData(userHandlers.create);
    usersTable.grantReadData(userHandlers.get);
    usersTable.grantReadWriteData(userHandlers.update);
    usersTable.grantReadWriteData(userHandlers.delete);

    portfoliosTable.grantReadWriteData(portfolioHandlers.create);
    portfoliosTable.grantReadData(portfolioHandlers.get);
    portfoliosTable.grantReadData(portfolioHandlers.list);
    portfoliosTable.grantReadWriteData(portfolioHandlers.update);
    portfoliosTable.grantReadWriteData(portfolioHandlers.delete);
    portfoliosTable.grantReadData(portfolioHandlers.summary);
    transactionsTable.grantReadData(portfolioHandlers.summary);
    assetsTable.grantReadData(portfolioHandlers.summary);

    transactionsTable.grantReadWriteData(transactionHandlers.create);
    transactionsTable.grantReadData(transactionHandlers.get);
    transactionsTable.grantReadData(transactionHandlers.list);
    transactionsTable.grantReadWriteData(transactionHandlers.update);
    transactionsTable.grantReadWriteData(transactionHandlers.delete);

    assetsTable.grantReadWriteData(assetHandlers.search);
    assetsTable.grantReadData(assetHandlers.get);
    assetsTable.grantReadData(assetHandlers.getBySymbol);

    transactionsTable.grantReadData(holdingHandlers.list);
    transactionsTable.grantReadData(holdingHandlers.get);
    portfoliosTable.grantReadData(holdingHandlers.list);
    portfoliosTable.grantReadData(holdingHandlers.get);
    assetsTable.grantReadData(holdingHandlers.list);
    assetsTable.grantReadData(holdingHandlers.get);

    allocationsTable.grantReadWriteData(allocationHandlers.create);
    allocationsTable.grantReadData(allocationHandlers.list);
    allocationsTable.grantReadWriteData(allocationHandlers.update);
    allocationsTable.grantReadWriteData(allocationHandlers.delete);
    allocationsTable.grantReadData(allocationHandlers.summary);
    portfoliosTable.grantReadData(allocationHandlers.summary);
    transactionsTable.grantReadData(allocationHandlers.summary);
    assetsTable.grantReadData(allocationHandlers.summary);

    const apiV1 = api.root.addResource('v1');

    const users = apiV1.addResource('users');
    const userById = users.addResource('{id}');

    users.addMethod('POST', new apigateway.LambdaIntegration(userHandlers.create));
    users.addMethod('OPTIONS', optionsIntegration, optionsMethodResponse);

    userById.addMethod('GET', new apigateway.LambdaIntegration(userHandlers.get));
    userById.addMethod('PUT', new apigateway.LambdaIntegration(userHandlers.update));
    userById.addMethod('DELETE', new apigateway.LambdaIntegration(userHandlers.delete));
    userById.addMethod('OPTIONS', optionsIntegration, optionsMethodResponse);

    const portfolios = apiV1.addResource('portfolios');
    const portfolioById = portfolios.addResource('{id}');
    const portfolioSummary = portfolioById.addResource('summary');
    const portfolioHoldings = portfolioById.addResource('holdings');
    const holdingByAssetId = portfolioHoldings.addResource('{assetId}');

    portfolios.addMethod('POST', new apigateway.LambdaIntegration(portfolioHandlers.create));
    portfolios.addMethod('GET', new apigateway.LambdaIntegration(portfolioHandlers.list));
    portfolios.addMethod('OPTIONS', optionsIntegration, optionsMethodResponse);
    portfolioById.addMethod('GET', new apigateway.LambdaIntegration(portfolioHandlers.get));
    portfolioById.addMethod('PUT', new apigateway.LambdaIntegration(portfolioHandlers.update));
    portfolioById.addMethod('DELETE', new apigateway.LambdaIntegration(portfolioHandlers.delete));
    portfolioById.addMethod('OPTIONS', optionsIntegration, optionsMethodResponse);

    portfolioSummary.addMethod('GET', new apigateway.LambdaIntegration(portfolioHandlers.summary));
    portfolioSummary.addMethod('OPTIONS', optionsIntegration, optionsMethodResponse);

    portfolioHoldings.addMethod('GET', new apigateway.LambdaIntegration(holdingHandlers.list));
    portfolioHoldings.addMethod('OPTIONS', optionsIntegration, optionsMethodResponse);

    holdingByAssetId.addMethod('GET', new apigateway.LambdaIntegration(holdingHandlers.get));
    holdingByAssetId.addMethod('OPTIONS', optionsIntegration, optionsMethodResponse);

    const transactions = apiV1.addResource('transactions');
    const transactionById = transactions.addResource('{id}');

    transactions.addMethod('POST', new apigateway.LambdaIntegration(transactionHandlers.create));
    transactions.addMethod('GET', new apigateway.LambdaIntegration(transactionHandlers.list));
    transactions.addMethod('OPTIONS', optionsIntegration, optionsMethodResponse);

    transactionById.addMethod('GET', new apigateway.LambdaIntegration(transactionHandlers.get));
    transactionById.addMethod('PUT', new apigateway.LambdaIntegration(transactionHandlers.update));
    transactionById.addMethod(
      'DELETE',
      new apigateway.LambdaIntegration(transactionHandlers.delete)
    );
    transactionById.addMethod('OPTIONS', optionsIntegration, optionsMethodResponse);

    const assets = apiV1.addResource('assets');
    const assetSearch = assets.addResource('search');
    const assetById = assets.addResource('{id}');
    const assetSymbol = assets.addResource('symbol');
    const assetBySymbol = assetSymbol.addResource('{symbol}');

    assetSearch.addMethod('GET', new apigateway.LambdaIntegration(assetHandlers.search));
    assetSearch.addMethod('OPTIONS', optionsIntegration, optionsMethodResponse);

    assetById.addMethod('GET', new apigateway.LambdaIntegration(assetHandlers.get));
    assetById.addMethod('OPTIONS', optionsIntegration, optionsMethodResponse);

    assetBySymbol.addMethod('GET', new apigateway.LambdaIntegration(assetHandlers.getBySymbol));
    assetBySymbol.addMethod('OPTIONS', optionsIntegration, optionsMethodResponse);

    const allocations = apiV1.addResource('allocations');
    const allocationById = allocations.addResource('{id}');
    const portfolioAllocations = portfolioById.addResource('allocations');
    const portfolioAllocationSummary = portfolioById.addResource('allocation-summary');

    allocations.addMethod('POST', new apigateway.LambdaIntegration(allocationHandlers.create));
    allocations.addMethod('OPTIONS', optionsIntegration, optionsMethodResponse);
    allocationById.addMethod('PUT', new apigateway.LambdaIntegration(allocationHandlers.update));
    allocationById.addMethod('DELETE', new apigateway.LambdaIntegration(allocationHandlers.delete));
    allocationById.addMethod('OPTIONS', optionsIntegration, optionsMethodResponse);

    portfolioAllocations.addMethod(
      'GET',
      new apigateway.LambdaIntegration(allocationHandlers.list)
    );
    portfolioAllocations.addMethod('OPTIONS', optionsIntegration, optionsMethodResponse);

    portfolioAllocationSummary.addMethod(
      'GET',
      new apigateway.LambdaIntegration(allocationHandlers.summary)
    );
    portfolioAllocationSummary.addMethod('OPTIONS', optionsIntegration, optionsMethodResponse);

    new cdk.CfnOutput(this, 'UsersTableName', {
      value: usersTable.tableName,
      description: 'Users DynamoDB table name',
    });

    new cdk.CfnOutput(this, 'PortfoliosTableName', {
      value: portfoliosTable.tableName,
      description: 'Portfolios DynamoDB table name',
    });

    new cdk.CfnOutput(this, 'AssetsTableName', {
      value: assetsTable.tableName,
      description: 'Assets DynamoDB table name',
    });

    new cdk.CfnOutput(this, 'TransactionsTableName', {
      value: transactionsTable.tableName,
      description: 'Transactions DynamoDB table name',
    });

    new cdk.CfnOutput(this, 'AllocationsTableName', {
      value: allocationsTable.tableName,
      description: 'Allocations DynamoDB table name',
    });
  }
}
