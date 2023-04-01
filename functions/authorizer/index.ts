import {
  APIGatewayAuthorizerResult,
  APIGatewayRequestAuthorizerEvent,
} from "aws-lambda";
import * as jwt from "jsonwebtoken";

type CustomJwtPayload = {
  personId: string;
  groups: string[];
};

export const handler = async (
  event: APIGatewayRequestAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> => {
  if (!event?.queryStringParameters?.access_token) {
    return generateDeny("anonymous", event.methodArn);
  }

  const decoded = jwt.decode(
    event.queryStringParameters["access_token"]
  ) as CustomJwtPayload;

  console.log("Decoded: ", decoded);

  if (!decoded?.personId) {
    return generateDeny("anonymous", event.methodArn);
  }

  const userInAGroup = decoded.groups.some(group => group === 'chat.admin' || group === 'chat.user');

  if (!userInAGroup) {
    return generateDeny(decoded.personId, event.methodArn);
  }


  return {
    ...generateAllow(decoded.personId, event.methodArn),
    context: {
      groups: JSON.stringify(decoded.groups),
    },
  };
};

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
