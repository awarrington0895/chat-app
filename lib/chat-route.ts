import { Construct } from "constructs";
import { aws_dynamodb as dynamo, aws_lambda as lambda } from "aws-cdk-lib";
import { WebSocketApi } from "@aws-cdk/aws-apigatewayv2-alpha";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as path from 'path';
import { WebSocketLambdaIntegration } from "@aws-cdk/aws-apigatewayv2-integrations-alpha";

interface ChatRouteProps {
    readonly routeName: string,
    readonly functionName: string,
    readonly owningApi: WebSocketApi,
    readonly table?: dynamo.Table
}

export class ChatRoute extends Construct {
    public readonly fn: NodejsFunction;

    constructor(scope: Construct, id: string, props: ChatRouteProps) {
        super(scope, id);

        const hasTable = props.table != null;

        const environment = {
            ...(hasTable && { table: props.table.tableName })
        };

        const fn = new NodejsFunction(this, `${props.functionName}Fn`, {
            runtime: lambda.Runtime.NODEJS_18_X,
            entry: path.join(__dirname, `/../functions/${props.functionName}/index.ts`),
            handler: 'handler',
            environment
        });

        if (hasTable) {
            props.table.grantReadWriteData(fn);
        }

        props.owningApi.addRoute(props.routeName, {
            integration: new WebSocketLambdaIntegration(`${props.functionName}Integration`, fn)
        });

        props.owningApi.grantManageConnections(fn);

        this.fn = fn;
    }
}