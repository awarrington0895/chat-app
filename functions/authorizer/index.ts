import {
  APIGatewayAuthorizerResult,
  APIGatewayRequestAuthorizerEvent,
} from "aws-lambda";
import { pipe } from "fp-ts/function";
import * as jwt from "jsonwebtoken";
import * as O from 'fp-ts/Option';
import * as TE from 'fp-ts/TaskEither';

export const handler = async (
  event: APIGatewayRequestAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> => {
  const payload = decode(event?.queryStringParameters?.access_token);

  if (O.isNone(payload)) {
    return generateDeny("anonymous", event.methodArn);
  }

  const personId = pipe(
    payload,
    O.map(payload => payload.personId),
  );

  if (O.isNone(personId)) {
    return generateDeny("anonymous", event.methodArn);
  }

  const inGroup = pipe(
    payload,
    O.map(payload => payload.groups),
    O.map(groups => userInAGroup(groups)),
    O.filter(inGroup => inGroup)
  );

  if (O.isNone(inGroup)) {
    return generateDeny(personId.value, event.methodArn);
  }

  return pipe(
    payload,
    O.map(payload => {
      return {
        ...generateAllow(payload.personId, event.methodArn),
        context: {
          groups: JSON.stringify(payload.groups),
        },
      };
    }),
    TE.fromOption(() => generateDeny(personId.value, event.methodArn)),
    TE.toUnion
  )();
};

type CustomJwtPayload = {
  personId: string;
  groups: string[];
};

function decode(token: string | undefined): O.Option<CustomJwtPayload> {
  return pipe(
    O.fromNullable(token),
    O.map(jwt.decode),
    O.map(decoded => decoded as CustomJwtPayload)
  );
}

function userInAGroup(groups: string[]): boolean {
  return groups.some(group => group === 'chat.admin' || group === 'chat.user');
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
