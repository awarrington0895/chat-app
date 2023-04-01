import { APIGatewayEvent, Handler } from "aws-lambda";
import {
  DynamoDBClient,
  PutItemCommand,
  PutItemCommandInput,
} from "@aws-sdk/client-dynamodb";
import { EventParser, HandlerResponse, badRequest, ok, serverError } from "../shared";
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
    TE.bind("connectionId", ({ event }) => EventParser.connectionId(event)),
    TE.bind("principalId", ({ event }) => EventParser.principalId(event)),
    TE.bind("groups", ({ event }) => EventParser.groups(event)),
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
