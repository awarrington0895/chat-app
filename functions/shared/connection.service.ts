import {
  DeleteItemCommand,
  DeleteItemCommandInput,
  DynamoDBClient,
  PutItemCommand,
  PutItemCommandInput,
} from "@aws-sdk/client-dynamodb";
import * as F from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import { serverError } from "./handler-responses";

type Config = {
  dynamodb: DynamoDBClient;
  tableName: string | undefined;
};

export const createConnectionService = ({ dynamodb, tableName }: Config) => {
  const createPutItemCommand = (details: PutItemCommandInput) => new PutItemCommand(details);

  const createDeleteItemCommand = (details: DeleteItemCommandInput) => new DeleteItemCommand(details);

  const createConnectionDetails = (connectionId: string) => new PutItemCommand({
    TableName: tableName,
    Item: {
      connectionId: {
        S: connectionId,
      },
    },
  });

  const createDeletionDetails = (connectionId: string) => new DeleteItemCommand({
    TableName: tableName,
        Key: {
            connectionId: {
                S: connectionId
            }
        }
  });

  const tryCreateConnection = (command: PutItemCommand) =>
    TE.tryCatch(
      () => dynamodb.send(command),
      () => serverError("Unable to create a session due to unknown server error")
    );

  const tryDeleteConnection = (command: DeleteItemCommand) => TE.tryCatch(
    () => dynamodb.send(command),
    () => serverError('Unable to remove a session due to unknown server error')
  );

  return {
    createConnection: F.flow(
      createConnectionDetails,
      tryCreateConnection
    ),

    deleteConnection: F.flow(
      createDeletionDetails,
      tryDeleteConnection
    )
  };
};
