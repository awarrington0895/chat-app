import { APIGatewayAuthorizerResult } from "aws-lambda";

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

export const allow = (principalId: string, resource: string) =>
  generatePolicy(principalId, "Allow", resource);

export const deny = (principalId: string, resource: string) =>
  generatePolicy(principalId, "Deny", resource);
