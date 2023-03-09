import { APIGatewayEvent } from 'aws-lambda';
import { HandlerResponse, badRequest } from './handler-responses';
import * as TE from 'fp-ts/TaskEither';
import * as F from 'fp-ts/function';

export * from './handler-responses';
export * from './connection.service';

export const parseConnectionId = (
    event: APIGatewayEvent
  ): TE.TaskEither<HandlerResponse, string> =>
    F.pipe(
      event.requestContext.connectionId,
      TE.fromNullable(
        badRequest("Must have a valid connectionId to create session")
      )
    );



