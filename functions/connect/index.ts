import { APIGatewayEvent, Handler } from "aws-lambda";
import {
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";
import {
  badRequest,
  createConnectionService,
  HandlerResponse,
  ok,
} from "../shared";
import * as F from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";

const connectionService = createConnectionService({
  dynamodb: new DynamoDBClient({ region: "us-east-1" }),
  tableName: process.env.table,
});

const parseConnectionId = (
  event: APIGatewayEvent
): TE.TaskEither<HandlerResponse, string> =>
  F.pipe(
    event.requestContext.connectionId,
    TE.fromNullable(
      badRequest("Must have a valid connectionId to create session")
    )
  );

export const handler: Handler = async (event: APIGatewayEvent) =>
  F.pipe(
    event,
    parseConnectionId,
    TE.chain(connectionService.createConnection),
    TE.map(() => ok("Connected")),
    TE.match(F.identity, F.identity)
  )();
