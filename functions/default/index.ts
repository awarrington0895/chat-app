import {
  ApiGatewayManagementApiClient,
  GetConnectionCommand,
  GetConnectionCommandOutput,
  PostToConnectionCommand,
  PostToConnectionCommandInput,
} from "@aws-sdk/client-apigatewaymanagementapi";
import { APIGatewayEvent, Handler } from "aws-lambda";

import { EventParser, ok, serverError } from "../shared";
import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import * as O from 'fp-ts/Option';
import * as J from 'fp-ts/Json';
import * as E from 'fp-ts/Either';
import { Task } from "fp-ts/Task";

export const handler: Handler = async (event: APIGatewayEvent) => {
  return pipe(
    event,
    createGatewayClient,
    TE.fromOption(() => serverError("Could not create gateway client")),
    TE.bindTo("client"),
    TE.bind("connectionId", () => EventParser.connectionId(event)),
    TE.bind("connectionInfo", ({ client, connectionId }) =>
      TE.fromTask(additionalConnectionInfo(client, connectionId))
    ),
    TE.bind('postParams', ({ connectionId, connectionInfo }) => getPostParms(connectionId, connectionInfo)),
    TE.chain(({ client, postParams }) => tryPostMessage(client, postParams)),
    TE.map(() => ok()),
    TE.toUnion
  );
};

function getPostParms(connectionId: string, connectionInfo: string | GetConnectionCommandOutput) {
  return pipe(
    J.stringify(connectionInfo),
    E.map(info => ({
      ConnectionId: connectionId,
      Data: Buffer.from(
        "Use the sendmessage route to send a message. Your info: " +
          info
      ),
    })),
    E.mapLeft(() => serverError("Failed to parse connection info")),
    TE.fromEither
  )

}

function additionalConnectionInfo(
  client: ApiGatewayManagementApiClient,
  connectionId: string
): Task<string | GetConnectionCommandOutput> {
  const result = async () => {
    try {
      return await client.send(
        new GetConnectionCommand({ ConnectionId: connectionId })
      );
    } catch (err) {
      return connectionId;
    }
  };

  return result;
}

function createGatewayClient(event: APIGatewayEvent): O.Option<ApiGatewayManagementApiClient> {
  return pipe(
    O.Do,
    O.apS('domainName', O.fromNullable(event.requestContext.domainName)),
    O.apS('stage', O.fromNullable(event.requestContext.stage)),
    O.map(({ domainName, stage }) => `https://${domainName}/${stage}`),
    O.map(endpoint => new ApiGatewayManagementApiClient({
      region: "us-east-1",
      endpoint,
    })),
  );
}

function tryPostMessage(
  client: ApiGatewayManagementApiClient,
  params: PostToConnectionCommandInput
) {
  return TE.tryCatch(
    () => client.send(new PostToConnectionCommand(params)),
    () => serverError("Error occurred during post to WS connection")
  );
}
