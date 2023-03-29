import { AttributeValue } from "@aws-sdk/client-dynamodb";

type Connection = {
  id: string;
  groups: string[];
};

const fromDynamo = (item: Record<string, AttributeValue>): Connection => ({
  id: item["connectionId"].S || "",
  groups: JSON.parse(item["groups"].S || "[]"),
});

export { Connection as Type, fromDynamo };
