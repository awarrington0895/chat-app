import { SNSEvent, SNSEventRecord } from "aws-lambda";
import * as A from "fp-ts/Array";
import { pipe } from "fp-ts/function";

export type Subscription = {
  firstName: string;
  lastName: string;
};

export const getMessages = (event: SNSEvent): string[] =>
  pipe(event.Records, A.map(fromRecord), A.map(subscriptionMessage));

const fromRecord = (record: SNSEventRecord): Subscription =>
  JSON.parse(record.Sns.Message);

const subscriptionMessage = (alert: Subscription): string =>
  `${alert.firstName} ${alert.lastName} has joined the newsletter!`;
