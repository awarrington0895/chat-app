import { Stack, StackProps, aws_dynamodb as dynamo, aws_lambda as lambda } from "aws-cdk-lib";
import { WebSocketApi, WebSocketStage } from "@aws-cdk/aws-apigatewayv2-alpha";
import { Construct } from "constructs";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import path = require("path");
import { WebSocketLambdaIntegration } from "@aws-cdk/aws-apigatewayv2-integrations-alpha";

export class AppStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const connectionTable = new dynamo.Table(this, "connectionTable", {
      partitionKey: {
        name: "connectionId",
        type: dynamo.AttributeType.STRING,
      },
    });

    const chatApi = new WebSocketApi(this, "chatApi");

    new WebSocketStage(this, "productionStage", {
      webSocketApi: chatApi,
      stageName: "production",
      autoDeploy: true,
    });

    const connectFn = new NodejsFunction(this, 'connectFn', {
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: path.join(__dirname, `/../functions/connect/index.ts`),
      handler: 'handler',
      environment: {
        table: connectionTable.tableName
      }
    });

    chatApi.addRoute('$connect', {
      integration: new WebSocketLambdaIntegration('ConnectIntegration', connectFn)
    });
  }
}
