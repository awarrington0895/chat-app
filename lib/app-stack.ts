import { WebSocketApi, WebSocketStage } from "@aws-cdk/aws-apigatewayv2-alpha";
import { WebSocketLambdaIntegration } from "@aws-cdk/aws-apigatewayv2-integrations-alpha";
import {
  aws_dynamodb as dynamo,
  aws_lambda as lambda,
  Stack,
  StackProps,
} from "aws-cdk-lib";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import * as path from "path";

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

    const connectFn = new NodejsFunction(this, "connectFn", {
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: path.join(__dirname, `/../functions/connect/index.ts`),
      handler: "handler",
      environment: {
        table: connectionTable.tableName,
      },
    });

    const disconnectFn = new NodejsFunction(this, "disconnectFn", {
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: path.join(__dirname, `/../functions/disconnect/index.ts`),
      handler: "handler",
      environment: {
        table: connectionTable.tableName,
      },
    });

    connectionTable.grantReadWriteData(connectFn);
    connectionTable.grantReadWriteData(disconnectFn);

    chatApi.addRoute("$connect", {
      integration: new WebSocketLambdaIntegration(
        "ConnectIntegration",
        connectFn
      ),
    });

    chatApi.addRoute("$disconnect", {
      integration: new WebSocketLambdaIntegration(
        "DisconnectIntegration",
        disconnectFn
      ),
    });
  }
}
