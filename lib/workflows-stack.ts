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

    const workflowResultsFn = new lambda.Function(this, "WorkflowResultsFn", {
      runtime: lambda.Runtime.NODEJS_16_X,
      code: lambda.Code.fromAsset("lambdas/workflow/results"),
      handler: "results.handler",
      environment: {
        WORKFLOW_ARN: workflow.stateMachineArn,
      },
    });
    workflow.grantRead(workflowResultsFn);

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
    workflowRs.addMethod("GET", new apigw.LambdaIntegration(workflowResultsFn));

    // Composite workflow service
    const initCompositeState = new sfn.Pass(this, "Init Composite");

    const subWorkflowState = new tasks.StepFunctionsStartExecution(
      this,
      "Sub Workflow",
      {
        stateMachine: workflow,
        integrationPattern: sfn.IntegrationPattern.RUN_JOB,
      }
    );
    const mapCompositeState = new sfn.Map(this, "Map State");
    mapCompositeState.iterator(subWorkflowState);

    const finalizeCompositeState = new sfn.Pass(this, "Finalize Composite");

    const compositeWorkflowDefinition = initCompositeState
      .next(mapCompositeState)
      .next(finalizeCompositeState);

    const compositeWorkflow = new sfn.StateMachine(this, "Workflow Composite", {
      definition: compositeWorkflowDefinition,
    });

    const compositeWorkflowStartFn = new lambda.Function(
      this,
      "CompositeWorkflowStartHandler",
      {
        runtime: lambda.Runtime.NODEJS_16_X,
        code: lambda.Code.fromAsset("lambdas/workflow/start-composite"),
        handler: "start-composite.handler",
        environment: {
          COMPOSITE_WORKFLOW_ARN: compositeWorkflow.stateMachineArn,
          SERVICE_URL: serviceApi.url,
        },
      }
    );
    compositeWorkflow.grantStartExecution(compositeWorkflowStartFn);

    const compositeWorkflowResultsFn = new lambda.Function(
      this,
      "CompositeWorkflowResultsFn",
      {
        runtime: lambda.Runtime.NODEJS_16_X,
        code: lambda.Code.fromAsset("lambdas/workflow/results-composite"),
        handler: "results-composite.handler",
        environment: {
          COMPOSITE_WORKFLOW_ARN: compositeWorkflow.stateMachineArn,
        },
      }
    );
    compositeWorkflow.grantRead(compositeWorkflowResultsFn);

    const compositeWorkflowsRs =
      workflowApi.root.addResource("compositeWorkflows");
    compositeWorkflowsRs.addMethod(
      "POST",
      new apigw.LambdaIntegration(compositeWorkflowStartFn)
    );
    const compositeWorkflowRs = compositeWorkflowsRs.addResource("{workflow}");
    compositeWorkflowRs.addMethod(
      "GET",
      new apigw.LambdaIntegration(compositeWorkflowResultsFn)
    );
  }
}
