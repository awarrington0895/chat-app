import { Handler, SNSEvent } from "aws-lambda";
import { ok } from "../shared";

// const dynamoClient = new DynamoDBClient({ region: "us-east-1" });

// const apigw = new ApiGatewayManagementApiClient({
//   region: "us-east-1",
//   endpoint: process.env.apiEndpoint,
// });

export const handler: Handler = async (event: SNSEvent) => {
  console.log(event);

  // let connections: ScanCommandOutput;

  // try {
  //   connections = await dynamoClient.send(
  //     new ScanCommand({ TableName: process.env.table })
  //   );
  // } catch (err) {
  //   console.error("Could not fetch connections from DynamoDb: ", err);

  //   return serverError("Failed to fetch connections");
  // }

  return ok();
};
