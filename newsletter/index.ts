import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";
import { Handler } from "aws-lambda";

type SubscriptionRequest = {
  firstName: string;
  lastName: string;
  email: string;
};

const snsClient = new SNSClient({
  region: "us-east-1",
});

export const handler: Handler = async (event: SubscriptionRequest) => {
  console.log(event);

  const command = new PublishCommand({
    Message: JSON.stringify(event),
    TopicArn: process.env.topicArn,
    Subject: "Newsletter Subscription Notification",
  });

  const response = await snsClient.send(command);

  console.log("SNS response: ", response);

  return {
    statusCode: 200,
    message: "Ok",
  };
};
