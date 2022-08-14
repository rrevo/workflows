const AWS = require("aws-sdk");
const sfn = new AWS.StepFunctions();

exports.handler = async function (event) {
  const inputBody = JSON.parse(event.body);
  const token = inputBody.callbackToken;

  const output = {
    status: inputBody.status,
    data: inputBody.data,
  };

  await sfn
    .sendTaskSuccess({
      output: JSON.stringify(output),
      taskToken: token,
    })
    .promise();

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  };
};
