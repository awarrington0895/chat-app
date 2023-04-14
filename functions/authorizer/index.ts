import {
  APIGatewayAuthorizerResult,
  APIGatewayRequestAuthorizerEvent,
} from "aws-lambda";
import * as E from "fp-ts/Either";
import * as J from "fp-ts/Json";
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";
import * as Policy from "./policy";
import * as Auth from './auth';

export const handler = async (
  event: APIGatewayRequestAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> =>
  pipe(
    Auth.decode_jwt(event?.queryStringParameters?.access_token),
    TE.fromOption(() => Policy.deny("anonymous", event.methodArn)),
    TE.filterOrElse(
      (token) => Auth.userInAGroup(token.groups),
      (token) => Policy.deny(token.personId, event.methodArn)
    ),
    TE.chain((token) => generatePolicyWithContext(token, event)),
    TE.toUnion
  )();

function generatePolicyWithContext(
  token: Auth.JwtPayload,
  event: APIGatewayRequestAuthorizerEvent
): TE.TaskEither<APIGatewayAuthorizerResult, APIGatewayAuthorizerResult> {
  return pipe(
    J.stringify(token.groups),
    E.map((groups) => ({
      ...Policy.allow(token.personId, event.methodArn),
      context: {
        groups,
      },
    })),
    TE.fromEither,
    TE.mapLeft(() => Policy.deny(token.personId, event.methodArn))
  );
}
