const AWS = require("aws-sdk");
const sfn = new AWS.StepFunctions();

function extractResourceId(arn) {
  let lastIndexOf = arn.lastIndexOf(":");
  if (lastIndexOf > 0) {
    return arn.substring(lastIndexOf + 1);
  }
}

exports.handler = async function (event) {
  const serviceUrl = process.env.SERVICE_URL;
  const workflowUrl = `https://${event.requestContext.domainName}/prod/workflows/`;
  const stateMachineArn = process.env.WORKFLOW_ARN;

  const workflowInput = {
    serviceUrl,
    workflowUrl,
  };
  const startExecutionInput = {
    stateMachineArn: stateMachineArn,
    input: JSON.stringify(workflowInput),
  };

  const response = await sfn.startExecution(startExecutionInput).promise();

  const id = extractResourceId(response.executionArn);
  const output = {
    id,
    url: `${workflowUrl}${id}`,
  };

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(output),
  };
};
