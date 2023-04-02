import {
  APIGatewayAuthorizerResult,
  APIGatewayRequestAuthorizerEvent,
} from "aws-lambda";
import { pipe } from "fp-ts/function";
import * as jwt from "jsonwebtoken";
import * as O from "fp-ts/Option";
import * as TE from "fp-ts/TaskEither";

export const handler = async (
  event: APIGatewayRequestAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> =>
  pipe(
    decode(event?.queryStringParameters?.access_token),
    TE.fromOption(() => generateDeny("anonymous", event.methodArn)),
    TE.filterOrElse(
      (payload) => userInAGroup(payload.groups),
      (payload) => generateDeny(payload.personId, event.methodArn)
    ),
    TE.map((payload) => {
      return {
        ...generateAllow(payload.personId, event.methodArn),
        context: {
          groups: JSON.stringify(payload.groups),
        },
      } as APIGatewayAuthorizerResult;
    }),
    TE.toUnion
  )();

type CustomJwtPayload = {
  personId: string;
  groups: string[];
};

function decode(token: string | undefined): O.Option<CustomJwtPayload> {
  return pipe(
    O.fromNullable(token),
    O.map(jwt.decode),
    O.map((decoded) => decoded as CustomJwtPayload)
  );
}

function userInAGroup(groups: string[]): boolean {
  return groups.some(
    (group) => group === "chat.admin" || group === "chat.user"
  );
}

function generatePolicy(
  principalId: string,
  effect: string,
  resource: string
): APIGatewayAuthorizerResult {
  if (!principalId || !effect || !resource) {
    throw Error("Invalid policy inputs");
  }

  return {
    principalId,
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: effect,
          Resource: resource,
        },
      ],
    },
  };
}

const generateAllow = (principalId: string, resource: string) =>
  generatePolicy(principalId, "Allow", resource);

const generateDeny = (principalId: string, resource: string) =>
  generatePolicy(principalId, "Deny", resource);
