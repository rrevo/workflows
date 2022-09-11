const AWS = require("aws-sdk");
const sfn = new AWS.StepFunctions();

exports.handler = async function (event) {
  const stateMachineArn = process.env.IDEMPOTENT_WORKFLOW_ARN;

  const inputBody = JSON.parse(event.body);

  const startExecutionInput = {
    stateMachineArn: stateMachineArn,
    input: JSON.stringify(inputBody.input),
    name: inputBody.name,
  };

  var response;
  try {
    let startExecution = await sfn
      .startExecution(startExecutionInput)
      .promise();
    response = {
      message: "New execution",
      startExecution,
    };
  } catch (ex) {
    let executionArn =
      stateMachineArn.replace(":stateMachine:", ":execution:") +
      ":" +
      inputBody.name;
    let describeExecution = await sfn
      .describeExecution({ executionArn })
      .promise();
    response = {
      message: "Detected repeated execution",
      startExecution: ex,
      describeExecution,
    };
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(response),
  };
};
