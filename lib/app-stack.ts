import { WebSocketApi, WebSocketStage } from "@aws-cdk/aws-apigatewayv2-alpha";
import {
  aws_dynamodb as dynamo,
  aws_lambda as lambda,
  aws_sns as sns,
  aws_sns_subscriptions as subscriptions,
  Stack,
  StackProps,
} from "aws-cdk-lib";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import * as path from "path";
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

    const topic = new sns.Topic(this, "NewsletterTopic", {
      displayName: "Newsletter subscription topic",
    });

    const newsletterFn = new NodejsFunction(this, "newsletterFn", {
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: path.join(__dirname, `/../newsletter/index.ts`),
      handler: "handler",
      environment: {
        topicArn: topic.topicArn,
      },
    });

    topic.grantPublish(newsletterFn);

    const chatApi = new WebSocketApi(this, "chatApi");

    const productionStage = new WebSocketStage(this, "productionStage", {
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

    const notifierRoute = new ChatRoute(this, "subscriptionnotifierRoute", {
      functionName: "subscriptionnotifier",
      routeName: "subscriptionnotifier",
      owningApi: chatApi,
      table: connectionTable,
      extraEnvs: {
        apiEndpoint: parseHttpUrl(productionStage.url),
      },
    });

    topic.addSubscription(
      new subscriptions.LambdaSubscription(notifierRoute.fn)
    );
  }
}

function parseHttpUrl(wssUrl: string): string {
  const copy = wssUrl.split("").join("");

  return copy.replace("wss", "https");
}
