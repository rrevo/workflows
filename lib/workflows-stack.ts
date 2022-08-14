import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as tasks from "aws-cdk-lib/aws-stepfunctions-tasks";

export class WorkflowsStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // External service definition

    const serviceCallbackFn = new lambda.Function(
      this,
      "ServiceCallbackHandler",
      {
        runtime: lambda.Runtime.NODEJS_16_X,
        code: lambda.Code.fromAsset("lambdas/external-service/callback"),
        handler: "callback.handler",
      }
    );

    const serviceApi = new apigw.RestApi(this, "ServiceApi", {
      restApiName: "ServiceApi",
    });

    serviceApi.root.addMethod(
      "POST",
      new apigw.LambdaIntegration(serviceCallbackFn)
    );

    // Workflow service definition

    const initState = new sfn.Pass(this, "Init");

    const externalCallFn = new lambda.Function(this, "WorkflowExternalCaller", {
      runtime: lambda.Runtime.NODEJS_16_X,
      code: lambda.Code.fromAsset("lambdas/workflow/externalCall"),
      handler: "externalCall.handler",
    });
    const externalCallTask = new tasks.LambdaInvoke(
      this,
      "Invoke with callback",
      {
        lambdaFunction: externalCallFn,
        integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
        payload: sfn.TaskInput.fromObject({
          workflowExecutionArn: sfn.JsonPath.stringAt("$$.Execution.Id"),
          token: sfn.JsonPath.taskToken,
          serviceUrl: sfn.JsonPath.stringAt("$.serviceUrl"),
          workflowUrl: sfn.JsonPath.stringAt("$.workflowUrl"),
        }),
      }
    );

    const finalizeState = new sfn.Pass(this, "Finalize");

    const workflowDefinition = initState
      .next(externalCallTask)
      .next(finalizeState);

    const workflow = new sfn.StateMachine(this, "Workflow", {
      definition: workflowDefinition,
    });
    externalCallFn.grantInvoke(workflow);

    const workflowStartFn = new lambda.Function(this, "WorkflowStartHandler", {
      runtime: lambda.Runtime.NODEJS_16_X,
      code: lambda.Code.fromAsset("lambdas/workflow/start"),
      handler: "start.handler",
      environment: {
        WORKFLOW_ARN: workflow.stateMachineArn,
        SERVICE_URL: serviceApi.url,
      },
    });
    workflow.grantStartExecution(workflowStartFn);

    const workflowCompleteFn = new lambda.Function(
      this,
      "WorkflowCompleteHandler",
      {
        runtime: lambda.Runtime.NODEJS_16_X,
        code: lambda.Code.fromAsset("lambdas/workflow/complete"),
        handler: "complete.handler",
        environment: {
          WORKFLOW_ARN: workflow.stateMachineArn,
        },
      }
    );
    workflow.grantTaskResponse(workflowCompleteFn);

    const workflowApi = new apigw.RestApi(this, "WorkflowApi", {
      restApiName: "WorkflowApi",
    });

    const workflowsRs = workflowApi.root.addResource("workflows");
    workflowsRs.addMethod("POST", new apigw.LambdaIntegration(workflowStartFn));

    const workflowRs = workflowsRs.addResource("{workflow}");
    workflowRs.addMethod(
      "PUT",
      new apigw.LambdaIntegration(workflowCompleteFn)
    );
  }
}
