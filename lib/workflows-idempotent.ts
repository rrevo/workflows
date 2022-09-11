import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";

export class WorkflowIdempotentStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const noopState = new sfn.Pass(this, "noop");

    const noopWorkflow = new sfn.StateMachine(this, "Workflow Noop", {
      definition: noopState,
    });

    const idempotentWorkflowStartFn = new lambda.Function(
      this,
      "IdempotentWorkflowStartHandler",
      {
        runtime: lambda.Runtime.NODEJS_16_X,
        code: lambda.Code.fromAsset("lambdas/idempotent/start-idempotent"),
        handler: "start-idempotent.handler",
        environment: {
          IDEMPOTENT_WORKFLOW_ARN: noopWorkflow.stateMachineArn,
        },
      }
    );
    noopWorkflow.grantStartExecution(idempotentWorkflowStartFn);
    noopWorkflow.grantRead(idempotentWorkflowStartFn);

    const workflowIdempotentApi = new apigw.RestApi(
      this,
      "WorkflowIdempotentApi",
      {
        restApiName: "WorkflowIdempotentApi",
      }
    );

    const workflowIdempotentRs =
      workflowIdempotentApi.root.addResource("workflow");
    workflowIdempotentRs.addMethod(
      "POST",
      new apigw.LambdaIntegration(idempotentWorkflowStartFn)
    );
  }
}
