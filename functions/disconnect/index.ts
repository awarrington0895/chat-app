import {
  DeleteItemCommand,
  DeleteItemCommandInput,
  DeleteItemCommandOutput,
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";
import { APIGatewayEvent, Handler } from "aws-lambda";
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";
import {
  EventParser,
  HandlerResponse,
  badRequest,
  ok,
  serverError,
} from "../shared";

const client = new DynamoDBClient({ region: "us-east-1" });

export const handler: Handler = async (
  event: APIGatewayEvent
): Promise<HandlerResponse> =>
  pipe(
    TE.Do,
    TE.bind("connectionId", () => EventParser.connectionId(event)),
    TE.bind("table", () => parseTableName(process.env.table)),
    TE.map(deleteConnectionInput),
    TE.chain((params) => pipe(client, deleteConnection(params))),
    TE.map(() => ok("Disconnected")),
    TE.toUnion
  )();

type Context = {
  readonly connectionId: string;
  readonly table: string;
};

const deleteConnectionInput = (ctx: Context): DeleteItemCommandInput => ({
  TableName: ctx.table,
  Key: {
    connectionId: {
      S: ctx.connectionId,
    },
  },
});

const deleteConnection =
  (params: DeleteItemCommandInput) =>
  (
    client: DynamoDBClient
  ): TE.TaskEither<HandlerResponse, DeleteItemCommandOutput> =>
    TE.tryCatch(
      () => client.send(new DeleteItemCommand(params)),
      () =>
        serverError("Unable to remove a session due to unknown server error")
    );

const parseTableName = (
  tableName: string | undefined
): TE.TaskEither<HandlerResponse, string> =>
  pipe(
    tableName,
    TE.fromNullable(
      badRequest("Must have a valid table name to disconnect a session")
    )
  );
