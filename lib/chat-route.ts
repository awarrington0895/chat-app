import { WebSocketApi } from "@aws-cdk/aws-apigatewayv2-alpha";
import { WebSocketLambdaAuthorizer } from "@aws-cdk/aws-apigatewayv2-authorizers-alpha";
import { WebSocketLambdaIntegration } from "@aws-cdk/aws-apigatewayv2-integrations-alpha";
import { aws_dynamodb as dynamo, aws_lambda as lambda } from "aws-cdk-lib";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import * as path from "path";

interface ChatRouteProps {
  readonly routeName: string;
  readonly functionName: string;
  readonly owningApi: WebSocketApi;
  readonly table?: dynamo.Table;
}
// test me
export class ChatRoute extends Construct {
  public readonly fn: NodejsFunction;

  constructor(scope: Construct, id: string, props: ChatRouteProps) {
    super(scope, id);

    const hasTable = props.table != null;

    const environment = {
      ...(hasTable && { table: props.table.tableName }),
    };

    const fn = new NodejsFunction(this, `${props.functionName}Fn`, {
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: path.join(
        __dirname,
        `/../functions/${props.functionName}/index.ts`
      ),
      handler: "handler",
      environment,
    });

    if (hasTable) {
      props.table.grantReadWriteData(fn);
    }

    const integration = new WebSocketLambdaIntegration(
      `${props.functionName}Integration`,
      fn
    );

    if (props.routeName === "$connect") {
      const authorizeHandler = new NodejsFunction(this, `chatAuthorizer`, {
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: path.join(__dirname, `/../functions/authorizer/index.ts`),
        handler: "handler",
      });

      const authorizer = new WebSocketLambdaAuthorizer(
        "Authorizer",
        authorizeHandler,
        {
          identitySource: ["route.request.querystring.access_token"],
        }
      );

      props.owningApi.addRoute(props.routeName, {
        integration,
        authorizer,
      });
    } else {
      props.owningApi.addRoute(props.routeName, {
        integration,
      });
    }

    props.owningApi.grantManageConnections(fn);

    this.fn = fn;
  }
}
