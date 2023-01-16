import { APIGatewayEvent, Handler } from 'aws-lambda';
import { DeleteItemCommand, DeleteItemCommandInput, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { badRequest, ok, serverError } from '../shared';

const client = new DynamoDBClient({ region: 'us-east-1' });

export const handler: Handler = async (event: APIGatewayEvent) => {
    const connectionId = event.requestContext.connectionId;

    if (connectionId == null) {
        return badRequest('Must have a valid connectionId to disconnect a session');
    }

    const params: DeleteItemCommandInput = {
        TableName: process.env.table,
        Key: {
            connectionId: {
                S: connectionId
            }
        }
    };

    const deleteConnection = new DeleteItemCommand(params);

    try {
        await client.send(deleteConnection);    
    } catch (err) {
        console.error(err);

        return serverError('Unable to remove a session due to unknown server error');
    }

    return ok('Disconnected');
};