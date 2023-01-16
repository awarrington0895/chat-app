import { WebSocketApi, WebSocketStage } from "@aws-cdk/aws-apigatewayv2-alpha";
import { aws_dynamodb as dynamo, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { ChatRoute } from "./chat-route";

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

    new ChatRoute(this, "connectRoute", {
      functionName: "connect",
      routeName: "$connect",
      owningApi: chatApi,
      table: connectionTable,
    });

    new ChatRoute(this, "defaultRoute", {
      functionName: "default",
      routeName: "$default",
      owningApi: chatApi,
    });

    new ChatRoute(this, "disconnectRoute", {
      functionName: "disconnect",
      routeName: "$disconnect",
      owningApi: chatApi,
      table: connectionTable,
    });

    new ChatRoute(this, "sendmessageRoute", {
      functionName: "sendmessage",
      routeName: "sendmessage",
      owningApi: chatApi,
      table: connectionTable,
    });
  }
}
