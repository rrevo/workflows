const AWS = require("aws-sdk");
const sfn = new AWS.StepFunctions();

exports.handler = async function (event) {
  const { workflow } = event.pathParameters;
  const stateMachineArn = process.env.WORKFLOW_ARN;

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

  const externalServiceOutput = executionHistoryResults.events
    .filter((element) => {
      return element["type"] === "TaskSucceeded";
    })
    .map((element) => {
      const outputJson = element.taskSucceededEventDetails.output;
      return JSON.parse(outputJson);
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
