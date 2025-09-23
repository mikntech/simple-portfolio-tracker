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
      pointInTimeRecovery: true,
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
      pointInTimeRecovery: true,
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
      pointInTimeRecovery: true,
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
      logRetention: logs.RetentionDays.ONE_WEEK,
      bundling: {
        externalModules: ['aws-sdk'],
        minify: true,
        sourceMap: true,
      },
    };

    const optionsHandler = new NodejsFunction(this, 'OptionsHandler', {
      ...functionDefaults,
      entry: path.join(__dirname, `../../src/handlers/${stage}options.ts`),
      functionName: `pt2-options-${stage}`,
      memorySize: 128,
      timeout: cdk.Duration.seconds(10),
    });

    const userHandlers = {
      create: new NodejsFunction(this, 'CreateUserFunction', {
        ...functionDefaults,
        entry: path.join(__dirname, '../../src/handlers/users/create.ts'),
        functionName: `pt2-create-user-${stage}`,
      }),
      get: new NodejsFunction(this, 'GetUserFunction', {
        ...functionDefaults,
        entry: path.join(__dirname, '../../src/handlers/users/get.ts'),
        functionName: `pt2-get-user-${stage}`,
      }),
      update: new NodejsFunction(this, 'UpdateUserFunction', {
        ...functionDefaults,
        entry: path.join(__dirname, '../../src/handlers/users/update.ts'),
        functionName: `pt2-update-user-${stage}`,
      }),
      delete: new NodejsFunction(this, 'DeleteUserFunction', {
        ...functionDefaults,
        entry: path.join(__dirname, '../../src/handlers/users/delete.ts'),
        functionName: `pt2-delete-user-${stage}`,
      }),
    };

    const portfolioHandlers = {
      create: new NodejsFunction(this, 'CreatePortfolioFunction', {
        ...functionDefaults,
        entry: path.join(__dirname, '../../src/handlers/portfolios/create.ts'),
        functionName: `pt2-create-portfolio-${stage}`,
      }),
      get: new NodejsFunction(this, 'GetPortfolioFunction', {
        ...functionDefaults,
        entry: path.join(__dirname, '../../src/handlers/portfolios/get.ts'),
        functionName: `pt2-get-portfolio-${stage}`,
      }),
      list: new NodejsFunction(this, 'ListPortfoliosFunction', {
        ...functionDefaults,
        entry: path.join(__dirname, '../../src/handlers/portfolios/list.ts'),
        functionName: `pt2-list-portfolios-${stage}`,
      }),
      update: new NodejsFunction(this, 'UpdatePortfolioFunction', {
        ...functionDefaults,
        entry: path.join(__dirname, '../../src/handlers/portfolios/update.ts'),
        functionName: `pt2-update-portfolio-${stage}`,
      }),
      delete: new NodejsFunction(this, 'DeletePortfolioFunction', {
        ...functionDefaults,
        entry: path.join(__dirname, '../../src/handlers/portfolios/delete.ts'),
        functionName: `pt2-delete-portfolio-${stage}`,
      }),
      summary: new NodejsFunction(this, 'PortfolioSummaryFunction', {
        ...functionDefaults,
        entry: path.join(__dirname, '../../src/handlers/portfolios/summary.ts'),
        functionName: `pt2-portfolio-summary-${stage}`,
        timeout: cdk.Duration.minutes(1),
      }),
    };

    const transactionHandlers = {
      create: new NodejsFunction(this, 'CreateTransactionFunction', {
        ...functionDefaults,
        entry: path.join(__dirname, '../../src/handlers/transactions/create.ts'),
        functionName: `pt2-create-transaction-${stage}`,
      }),
      get: new NodejsFunction(this, 'GetTransactionFunction', {
        ...functionDefaults,
        entry: path.join(__dirname, '../../src/handlers/transactions/get.ts'),
        functionName: `pt2-get-transaction-${stage}`,
      }),
      list: new NodejsFunction(this, 'ListTransactionsFunction', {
        ...functionDefaults,
        entry: path.join(__dirname, '../../src/handlers/transactions/list.ts'),
        functionName: `pt2-list-transactions-${stage}`,
      }),
      update: new NodejsFunction(this, 'UpdateTransactionFunction', {
        ...functionDefaults,
        entry: path.join(__dirname, '../../src/handlers/transactions/update.ts'),
        functionName: `pt2-update-transaction-${stage}`,
      }),
      delete: new NodejsFunction(this, 'DeleteTransactionFunction', {
        ...functionDefaults,
        entry: path.join(__dirname, '../../src/handlers/transactions/delete.ts'),
        functionName: `pt2-delete-transaction-${stage}`,
      }),
    };

    const assetHandlers = {
      search: new NodejsFunction(this, 'SearchAssetsFunction', {
        ...functionDefaults,
        entry: path.join(__dirname, '../../src/handlers/assets/search.ts'),
        functionName: `pt2-search-assets-${stage}`,
      }),
      get: new NodejsFunction(this, 'GetAssetFunction', {
        ...functionDefaults,
        entry: path.join(__dirname, '../../src/handlers/assets/get.ts'),
        functionName: `pt2-get-asset-${stage}`,
      }),
      getBySymbol: new NodejsFunction(this, 'GetAssetBySymbolFunction', {
        ...functionDefaults,
        entry: path.join(__dirname, '../../src/handlers/assets/get-by-symbol.ts'),
        functionName: `pt2-get-asset-by-symbol-${stage}`,
      }),
    };

    const holdingHandlers = {
      list: new NodejsFunction(this, 'ListHoldingsFunction', {
        ...functionDefaults,
        entry: path.join(__dirname, '../../src/handlers/holdings/list.ts'),
        functionName: `pt2-list-holdings-${stage}`,
      }),
      get: new NodejsFunction(this, 'GetHoldingFunction', {
        ...functionDefaults,
        entry: path.join(__dirname, '../../src/handlers/holdings/get.ts'),
        functionName: `pt2-get-holding-${stage}`,
      }),
    };

    const allocationHandlers = {
      create: new NodejsFunction(this, 'CreateAllocationFunction', {
        ...functionDefaults,
        entry: path.join(__dirname, '../../src/handlers/allocations/create.ts'),
        functionName: `pt2-create-allocation-${stage}`,
      }),
      list: new NodejsFunction(this, 'ListAllocationsFunction', {
        ...functionDefaults,
        entry: path.join(__dirname, '../../src/handlers/allocations/list.ts'),
        functionName: `pt2-list-allocations-${stage}`,
      }),
      update: new NodejsFunction(this, 'UpdateAllocationFunction', {
        ...functionDefaults,
        entry: path.join(__dirname, '../../src/handlers/allocations/update.ts'),
        functionName: `pt2-update-allocation-${stage}`,
      }),
      delete: new NodejsFunction(this, 'DeleteAllocationFunction', {
        ...functionDefaults,
        entry: path.join(__dirname, '../../src/handlers/allocations/delete.ts'),
        functionName: `pt2-delete-allocation-${stage}`,
      }),
      summary: new NodejsFunction(this, 'GetAllocationSummaryFunction', {
        ...functionDefaults,
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
    users.addMethod('OPTIONS', new apigateway.LambdaIntegration(optionsHandler));

    userById.addMethod('GET', new apigateway.LambdaIntegration(userHandlers.get));
    userById.addMethod('PUT', new apigateway.LambdaIntegration(userHandlers.update));
    userById.addMethod('DELETE', new apigateway.LambdaIntegration(userHandlers.delete));
    userById.addMethod('OPTIONS', new apigateway.LambdaIntegration(optionsHandler));

    const portfolios = apiV1.addResource('portfolios');
    const portfolioById = portfolios.addResource('{id}');
    const portfolioSummary = portfolioById.addResource('summary');
    const portfolioHoldings = portfolioById.addResource('holdings');
    const holdingByAssetId = portfolioHoldings.addResource('{assetId}');

    portfolios.addMethod('POST', new apigateway.LambdaIntegration(portfolioHandlers.create));
    portfolios.addMethod('GET', new apigateway.LambdaIntegration(portfolioHandlers.list));
    portfolios.addMethod('OPTIONS', new apigateway.LambdaIntegration(optionsHandler));
    portfolioById.addMethod('GET', new apigateway.LambdaIntegration(portfolioHandlers.get));
    portfolioById.addMethod('PUT', new apigateway.LambdaIntegration(portfolioHandlers.update));
    portfolioById.addMethod('DELETE', new apigateway.LambdaIntegration(portfolioHandlers.delete));
    portfolioById.addMethod('OPTIONS', new apigateway.LambdaIntegration(optionsHandler));

    portfolioSummary.addMethod('GET', new apigateway.LambdaIntegration(portfolioHandlers.summary));
    portfolioSummary.addMethod('OPTIONS', new apigateway.LambdaIntegration(optionsHandler));

    portfolioHoldings.addMethod('GET', new apigateway.LambdaIntegration(holdingHandlers.list));
    portfolioHoldings.addMethod('OPTIONS', new apigateway.LambdaIntegration(optionsHandler));

    holdingByAssetId.addMethod('GET', new apigateway.LambdaIntegration(holdingHandlers.get));
    holdingByAssetId.addMethod('OPTIONS', new apigateway.LambdaIntegration(optionsHandler));

    const transactions = apiV1.addResource('transactions');
    const transactionById = transactions.addResource('{id}');

    transactions.addMethod('POST', new apigateway.LambdaIntegration(transactionHandlers.create));
    transactions.addMethod('GET', new apigateway.LambdaIntegration(transactionHandlers.list));
    transactions.addMethod('OPTIONS', new apigateway.LambdaIntegration(optionsHandler));

    transactionById.addMethod('GET', new apigateway.LambdaIntegration(transactionHandlers.get));
    transactionById.addMethod('PUT', new apigateway.LambdaIntegration(transactionHandlers.update));
    transactionById.addMethod(
      'DELETE',
      new apigateway.LambdaIntegration(transactionHandlers.delete)
    );
    transactionById.addMethod('OPTIONS', new apigateway.LambdaIntegration(optionsHandler));

    const assets = apiV1.addResource('assets');
    const assetSearch = assets.addResource('search');
    const assetById = assets.addResource('{id}');
    const assetSymbol = assets.addResource('symbol');
    const assetBySymbol = assetSymbol.addResource('{symbol}');

    assetSearch.addMethod('GET', new apigateway.LambdaIntegration(assetHandlers.search));
    assetSearch.addMethod('OPTIONS', new apigateway.LambdaIntegration(optionsHandler));

    assetById.addMethod('GET', new apigateway.LambdaIntegration(assetHandlers.get));
    assetById.addMethod('OPTIONS', new apigateway.LambdaIntegration(optionsHandler));

    assetBySymbol.addMethod('GET', new apigateway.LambdaIntegration(assetHandlers.getBySymbol));
    assetBySymbol.addMethod('OPTIONS', new apigateway.LambdaIntegration(optionsHandler));

    const allocations = apiV1.addResource('allocations');
    const allocationById = allocations.addResource('{id}');
    const portfolioAllocations = portfolioById.addResource('allocations');
    const portfolioAllocationSummary = portfolioById.addResource('allocation-summary');

    allocations.addMethod('POST', new apigateway.LambdaIntegration(allocationHandlers.create));
    allocations.addMethod('OPTIONS', new apigateway.LambdaIntegration(optionsHandler));
    allocationById.addMethod('PUT', new apigateway.LambdaIntegration(allocationHandlers.update));
    allocationById.addMethod('DELETE', new apigateway.LambdaIntegration(allocationHandlers.delete));
    allocationById.addMethod('OPTIONS', new apigateway.LambdaIntegration(optionsHandler));

    portfolioAllocations.addMethod(
      'GET',
      new apigateway.LambdaIntegration(allocationHandlers.list)
    );
    portfolioAllocations.addMethod('OPTIONS', new apigateway.LambdaIntegration(optionsHandler));

    portfolioAllocationSummary.addMethod(
      'GET',
      new apigateway.LambdaIntegration(allocationHandlers.summary)
    );
    portfolioAllocationSummary.addMethod(
      'OPTIONS',
      new apigateway.LambdaIntegration(optionsHandler)
    );

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
