import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";
import {
  DynamoDBClient,
  ScanCommand,
  ScanCommandOutput,
} from "@aws-sdk/client-dynamodb";
import { APIGatewayEvent, Handler } from "aws-lambda";

import { badRequest, ok, serverError } from "../shared";

const dynamoClient = new DynamoDBClient({ region: "us-east-1" });

export const handler: Handler = async (event: APIGatewayEvent) => {
  const endpoint = `https://${event.requestContext.domainName}/${event.requestContext.stage}`;

  const apigw = new ApiGatewayManagementApiClient({
    region: "us-east-1",
    endpoint,
  });

  const message: string = JSON.parse(event.body || "{ message: ''}").message;

  if (message === "") {
    const errorMessage =
      "Body must contain a message attribute with a non-empty string";
    try {
      await apigw.send(
        new PostToConnectionCommand({
          ConnectionId: event.requestContext.connectionId,
          Data: Buffer.from(errorMessage),
        })
      );
    } catch (err) {
      console.error(err);
    }

    return badRequest(errorMessage);
  }

  let connections: ScanCommandOutput;

  try {
    connections = await dynamoClient.send(
      new ScanCommand({ TableName: process.env.table })
    );
  } catch (err) {
    console.error("Could not fetch connections from DynamoDb: ", err);

    return serverError("Failed to fetch connections");
  }

  const sendMessages = connections.Items?.map(async (item) => {
    const connectionId = item["connectionId"].S;

    if (connectionId !== event.requestContext.connectionId) {
      try {
        await apigw.send(
          new PostToConnectionCommand({
            ConnectionId: connectionId,
            Data: Buffer.from(JSON.stringify(message)),
          })
        );
      } catch (err) {
        console.error("Unable to post message to connection: ", err);
      }
    }
  });

  try {
    await Promise.all(sendMessages!);
  } catch (err) {
    return serverError("Unable to send messages");
  }

  return ok();
};
