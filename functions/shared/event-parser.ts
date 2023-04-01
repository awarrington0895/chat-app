import { APIGatewayEvent } from "aws-lambda";
import { pipe } from "fp-ts/lib/function";
import { HandlerResponse, badRequest } from "./http-response";
import * as TE from 'fp-ts/TaskEither';

export const principalId = (event: APIGatewayEvent) =>
  pipe(
    event.requestContext.authorizer?.principalId,
    parseEventKey("principalId")
  );

export const groups = (event: APIGatewayEvent) =>
  pipe(event.requestContext.authorizer?.groups, parseEventKey("groups"));

export const connectionId = (event: APIGatewayEvent) =>
  pipe(event.requestContext.connectionId, parseEventKey("connectionId"));

const parseEventKey =
  (keyName: string) =>
  (key: string | undefined): TE.TaskEither<HandlerResponse, string> =>
    pipe(
      key,
      TE.fromNullable(badRequest(`Event must have a valid ${keyName}`))
    );