import { APIGatewayEvent, Context, Handler } from "aws-lambda";
import {
  DynamoDBClient,
  PutItemCommand,
  PutItemCommandInput,
} from "@aws-sdk/client-dynamodb";
import { badRequest, HandlerResponse, ok, serverError } from "../shared";
import * as F from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import * as T from "fp-ts/Task";

const client = new DynamoDBClient({ region: "us-east-1" });

const parseConnectionId = (
  event: APIGatewayEvent
): TE.TaskEither<HandlerResponse, string> =>
  F.pipe(
    event.requestContext.connectionId,
    TE.fromNullable(
      badRequest("Must have a valid connectionId to create session")
    )
  );

const toPutItemInput =
  (connectionId: string) => (tableName: string | undefined) => ({
    TableName: tableName,
    Item: {
      connectionId: {
        S: connectionId,
      },
    },
  });

const createPutItemCommand = (param: PutItemCommandInput) =>
  new PutItemCommand(param);

const tryCreateConnection = (command: PutItemCommand) =>
  TE.tryCatch(
    () => client.send(command),
    () => serverError("Unable to create a session due to unknown server error")
  );

export const handler: Handler = async (event: APIGatewayEvent) =>
  F.pipe(
    parseConnectionId(event),
    TE.map((cid) => F.pipe(process.env.table, toPutItemInput(cid))),
    TE.map(createPutItemCommand),
    TE.chain(tryCreateConnection),
    TE.map(() => ok("Connected")),
    TE.fold(T.of, T.of)
  )();
