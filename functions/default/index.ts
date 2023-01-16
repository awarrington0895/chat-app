import {
  ApiGatewayManagementApiClient,
  GetConnectionCommand,
  PostToConnectionCommand,
  PostToConnectionCommandInput,
} from "@aws-sdk/client-apigatewaymanagementapi";
import { APIGatewayEvent, Handler } from "aws-lambda";

import { ok, serverError } from "../shared";

export const handler: Handler = async (event: APIGatewayEvent) => {
  const endpoint = `https://${event.requestContext.domainName}/${event.requestContext.stage}`;

  const client = new ApiGatewayManagementApiClient({
    region: "us-east-1",
    endpoint,
  });

  const connectionId = event.requestContext.connectionId;

  let connectionInfo;

  try {
    connectionInfo = await client.send(
      new GetConnectionCommand({
        ConnectionId: connectionId,
      })
    );
  } catch (err) {
    connectionInfo = connectionId;
  }

  const params: PostToConnectionCommandInput = {
    ConnectionId: connectionId,
    Data: Buffer.from(
      "Use the sendmessage route to send a message. Your info: " +
        JSON.stringify(connectionInfo)
    ),
  };

  try {
    await client.send(new PostToConnectionCommand(params));
  } catch (err) {
    console.error(err);

    return serverError("Error occurred during post to WS connection");
  }

  return ok();
};
