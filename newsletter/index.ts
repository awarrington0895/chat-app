import { PublishCommand, PublishCommandInput, PublishCommandOutput, SNSClient } from "@aws-sdk/client-sns";
import { Handler } from "aws-lambda";
import { HandlerResponse, badRequest, ok, serverError } from "../functions/shared";
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as J from 'fp-ts/Json';
import * as E from 'fp-ts/Either';
import * as T from 'fp-ts/Task';

const snsClient = new SNSClient({
  region: "us-east-1",
});

export const handler: Handler = async event => pipe(event, publishEventToSns)();

const publishEventToSns = (event: SubscriptionRequest): T.Task<HandlerResponse> => pipe(
  stringifyEvent(event),
  TE.fromEither,
  TE.map(getSnsInput),
  TE.chain(publishSubscription),
  TE.map(() => ok()),
  TE.toUnion
);

type SubscriptionRequest = Readonly<{
  firstName: string;
  lastName: string;
  email: string;
}>;

const stringifyEvent = (event: SubscriptionRequest): E.Either<HandlerResponse, string> => pipe(
  J.stringify(event),
  E.mapLeft(e => badRequest('Unable to parse input: ' + e))
);

const getSnsInput = (event: string): PublishCommandInput => ({
  Message: event,
  TopicArn: process.env.topicArn,
  Subject: "Newsletter Subscription Notification",
});

const publishSubscription = (input: PublishCommandInput): TE.TaskEither<HandlerResponse, PublishCommandOutput> => TE.tryCatch(
  () => {
    return snsClient.send(new PublishCommand(input))
  },
  () => serverError('Unable to publish message to SNS for newsletter notification')
);
