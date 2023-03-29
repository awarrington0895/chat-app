import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";
import {
  DynamoDBClient,
  ScanCommand,
  ScanCommandOutput,
} from "@aws-sdk/client-dynamodb";
import { Handler, SNSEvent } from "aws-lambda";
import { Connection, ok, serverError } from "../shared";
import { getMessages } from "./subscription";

const dynamoClient = new DynamoDBClient({ region: "us-east-1" });

const apigw = new ApiGatewayManagementApiClient({
  region: "us-east-1",
  endpoint: process.env.apiEndpoint,
});

export const handler: Handler = async (event: SNSEvent) => {
  console.log(event);

  let connections: ScanCommandOutput;

  try {
    connections = await dynamoClient.send(
      new ScanCommand({ TableName: process.env.table })
    );
  } catch (err) {
    console.error("Could not fetch connections from DynamoDb: ", err);

    return serverError("Failed to fetch connections");
  }

  const messages = getMessages(event);

  const sendSubscriptionNotifications = connections.Items?.map(async (item) => {
    const connection = Connection.fromDynamo(item);

    const postMessages = messages.map(async (message) => {
      if (connection.groups.includes("chat.admin")) {
        try {
          await apigw.send(
            new PostToConnectionCommand({
              ConnectionId: connection.id,
              Data: Buffer.from(JSON.stringify(message)),
            })
          );
        } catch (err: unknown) {
          console.error(
            "Unable to post message to connection\n\tconnection={}\n\tmessage={}\n\terror={}",
            connection,
            message,
            err
          );
        }
      }
    });

    return Promise.all(postMessages);
  });

  try {
    await Promise.all(sendSubscriptionNotifications!);
  } catch (err) {
    console.error("Error occurred while waiting for subscription notifications to finish\n\terror={}", err);

    return serverError('Unable to notify admins of newsletter subscription');
  }

  return ok();
};
