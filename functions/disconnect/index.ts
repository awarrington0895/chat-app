import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { APIGatewayEvent, Handler } from 'aws-lambda';
import * as F from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import { createConnectionService, HandlerResponse, ok, parseConnectionId } from '../shared';

const connectionService = createConnectionService({
    dynamodb: new DynamoDBClient({ region: 'us-east-1' }),
    tableName: process.env.table
});

export const handler: Handler = async (event: APIGatewayEvent): Promise<HandlerResponse> => F.pipe(
    event,
    parseConnectionId,
    TE.chain(connectionService.deleteConnection),
    TE.map(() => ok('Disconnected')),
    TE.toUnion
)();