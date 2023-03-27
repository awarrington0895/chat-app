import { Handler } from "aws-lambda";

export const handler: Handler = async (event: any) => {
  console.log(event);
  return {
    statusCode: 200,
    message: "Ok",
  };
};
