import { APIGatewayRequestAuthorizerEvent } from 'aws-lambda';
import * as jwt from 'jsonwebtoken';

export const handler = async (event: APIGatewayRequestAuthorizerEvent) => {
    // TODO implement
    console.log("Event: ", event);

    if (!event.queryStringParameters) {
        return generateDeny('me', event.methodArn);
    }

    console.log("Decoded: ", jwt.decode(event.queryStringParameters['access_token']!));

    return generateDeny('me', event.methodArn);
};

type PolicyStatement = {
    Action: string;
    Effect: string;
    Resource: string;
}

type AuthorizerResponse = {
    principalId: string,
    policyDocument: {
        Version: string,
        Statement: PolicyStatement[]
    }
}

function generatePolicy(principalId: string, effect: string, resource: string): AuthorizerResponse {
    // Required output:
    if (!principalId || !effect || !resource) {
        throw Error('Invalid policy inputs');
    }

    return {
        principalId,
        policyDocument: {
            Version: '2012-10-17',
            Statement: [{
                Action: 'execute-api:Invoke',
                Effect: effect,
                Resource: resource
            }]
        }
    };
}

const generateAllow = (principalId: string, resource: string) => generatePolicy(principalId, 'Allow', resource);

const generateDeny = (principalId: string, resource: string) => generatePolicy(principalId, 'Deny', resource);