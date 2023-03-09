import { APIGatewayEvent, Handler } from "aws-lambda";
import {
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";
import {
  createConnectionService,
  HandlerResponse,
  ok,
  parseConnectionId
} from "../shared";
import * as F from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";

const connectionService = createConnectionService({
  dynamodb: new DynamoDBClient({ region: "us-east-1" }),
  tableName: process.env.table,
});

export const handler: Handler = async (event: APIGatewayEvent): Promise<HandlerResponse> =>
  F.pipe(
    event,
    parseConnectionId,
    TE.chain(connectionService.createConnection),
    TE.map(() => ok("Connected")),
    TE.toUnion,
  )();
