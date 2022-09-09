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
    response = await sfn.startExecution(startExecutionInput).promise();
  } catch (ex) {
    response = ex;
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(response),
  };
};
