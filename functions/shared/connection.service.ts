import {
  DynamoDBClient,
  PutItemCommand,
} from "@aws-sdk/client-dynamodb";
import * as F from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import { serverError } from "./handler-responses";

type Config = {
  dynamodb: DynamoDBClient;
  tableName: string | undefined;
};

export const createConnectionService = ({ dynamodb, tableName }: Config) => {
  const setConnectionDetails = (connectionId: string) => new PutItemCommand({
    TableName: tableName,
    Item: {
      connectionId: {
        S: connectionId,
      },
    },
  });

  const tryCreateConnection = (command: PutItemCommand) =>
    TE.tryCatch(
      () => dynamodb.send(command),
      () => serverError("Unable to create a session due to unknown server error")
    );

  return {
    createConnection: F.flow(
      setConnectionDetails,
      tryCreateConnection
    ),
  };
};
