import { APIGatewayEvent, Handler } from "aws-lambda";
import {
  DynamoDBClient,
  PutItemCommand,
  PutItemCommandInput,
} from "@aws-sdk/client-dynamodb";
import { HandlerResponse, badRequest, ok, serverError } from "../shared";
import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";

const client = new DynamoDBClient({ region: "us-east-1" });

export const handler: Handler = async (
  event: APIGatewayEvent
): Promise<HandlerResponse> =>
  pipe(
    event,
    TE.right,
    TE.bindTo("event"),
    TE.bind("table", () => parseTableName(process.env.table)),
    TE.bind("connectionId", ({ event }) => parseConnectionId(event)),
    TE.bind("principalId", ({ event }) => parsePrincipalId(event)),
    TE.bind("groups", ({ event }) => parseGroups(event)),
    TE.map(createConnectionParams),
    TE.chain(params => pipe(client, createConnection(params))),
    TE.map(() => ok("Connected")),
    TE.toUnion
  )();

type ConnectionInput = Readonly<{
  table: string;
  connectionId: string;
  principalId: string;
  groups: string;
}>;

const parseTableName = (tableName: string | undefined): TE.TaskEither<HandlerResponse, string> => pipe(
  tableName,
  TE.fromNullable(serverError("Unable to create connection due to server error"))
);

const parsePrincipalId = (event: APIGatewayEvent) =>
  pipe(
    event.requestContext.authorizer?.principalId,
    parseEventKey("principalId")
  );

const parseGroups = (event: APIGatewayEvent) =>
  pipe(event.requestContext.authorizer?.groups, parseEventKey("groups"));

const parseConnectionId = (event: APIGatewayEvent) =>
  pipe(event.requestContext.connectionId, parseEventKey("connectionId"));

const parseEventKey =
  (keyName: string) =>
  (key: string | undefined): TE.TaskEither<HandlerResponse, string> =>
    pipe(
      key,
      TE.fromNullable(badRequest(`Event must have a valid ${keyName}`))
    );

const createConnectionParams = ({
  table,
  connectionId,
  principalId,
  groups,
}: ConnectionInput) => {
  return {
    TableName: table,
    Item: {
      connectionId: {
        S: connectionId,
      },
      personId: {
        S: principalId,
      },
      groups: {
        S: groups,
      },
    },
  };
};

const createConnection = (params: PutItemCommandInput) => (client: DynamoDBClient) =>
  TE.tryCatch(
    () => client.send(new PutItemCommand(params)),
    () => serverError("Unable to create a session due to unknown server error")
  );
