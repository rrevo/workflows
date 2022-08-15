const AWS = require("aws-sdk");
const sfn = new AWS.StepFunctions();

exports.handler = async function (event) {
  const { workflow } = event.pathParameters;
  const stateMachineArn = process.env.COMPOSITE_WORKFLOW_ARN;

  const executionArn = `${stateMachineArn.replace(
    ":stateMachine:",
    ":execution:"
  )}:${workflow}`;

  const executionHistoryResults = await sfn
    .getExecutionHistory({
      executionArn,
      includeExecutionData: true,
    })
    .promise();

  const executionSucceededOutput = executionHistoryResults.events.filter(
    (element) => {
      return element["type"] === "ExecutionSucceeded";
    }
  );
  const externalServiceOutput = JSON.parse(
    executionSucceededOutput[0].executionSucceededEventDetails.output
  ).map((element) => {
    return element.Output;
  });

  const output = {
    externalServiceOutput,
  };

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(output),
  };
};
