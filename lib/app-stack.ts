import { Stack, StackProps, aws_dynamodb as dynamo } from "aws-cdk-lib";
import { WebSocketApi, WebSocketStage } from "@aws-cdk/aws-apigatewayv2-alpha";
import { Construct } from "constructs";

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
  }
}
