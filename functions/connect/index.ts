import { APIGatewayEvent, Context, Handler } from 'aws-lambda';
import { DynamoDBClient, PutItemCommand, PutItemCommandInput } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });

const createResponse = (statusCode: number, message?: string) => ({
    statusCode,
    body: message
});

const badRequest = (message: string) => createResponse(400, message);

const ok = (message?: string) => createResponse(200, message);

const serverError = (message: string) => createResponse(500, message);

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