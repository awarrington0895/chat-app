import { APIGatewayEvent, Context, Handler } from 'aws-lambda';
import { DynamoDBClient, PutItemCommand, PutItemCommandInput } from '@aws-sdk/client-dynamodb';
import { badRequest, ok, serverError } from '../shared';

const client = new DynamoDBClient({ region: 'us-east-1' });

export const handler: Handler = async (event: APIGatewayEvent, context: Context) => {
    const connectionId = event.requestContext.connectionId;

    if (connectionId == null) {
        return badRequest('Must have a valid connectionId to create session');
    }

    const params: PutItemCommandInput = {
        TableName: process.env.table,
        Item: {
            connectionId: {
                S: connectionId
            }
        }
    };

    const createConnection = new PutItemCommand(params);

    try {
        await client.send(createConnection);    
    } catch (err) {
        console.error(err);

        return serverError('Unable to create a session due to unknown server error');
    }

    return ok('Connected');
};