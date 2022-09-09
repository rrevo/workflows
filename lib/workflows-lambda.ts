import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as tasks from "aws-cdk-lib/aws-stepfunctions-tasks";

export class WorkflowsLambdaStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const fibonacciFn = new lambda.Function(this, "fibonacciFnHandler", {
      runtime: lambda.Runtime.NODEJS_16_X,
      code: lambda.Code.fromAsset("lambdas/fibonacci/generator"),
      handler: "generator.handler",
    });

    const fibonacciCallTask = new tasks.LambdaInvoke(
      this,
      "Fibonacci generator",
      {
        lambdaFunction: fibonacciFn,
        outputPath: "$.Payload",
      }
    );

    const adderState = new sfn.Pass(this, "Adder", {
      parameters: { "added.$": "States.MathAdd($, 7)" },
    });
    const mapCompositeState = new sfn.Map(this, "Mapper");
    mapCompositeState.iterator(adderState);

    const workflowDefinition = fibonacciCallTask.next(mapCompositeState);

    const workflow = new sfn.StateMachine(this, "WorkflowLambda", {
      definition: workflowDefinition,
    });
    fibonacciFn.grantInvoke(workflow);
  }
}
