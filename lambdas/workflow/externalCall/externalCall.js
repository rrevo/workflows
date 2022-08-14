const https = require("https");
const url = require("url");

function doRequest(options, inputBody) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      res.setEncoding("utf8");
      let responseBody = "";

      res.on("data", (chunk) => {
        responseBody += chunk;
      });

      res.on("end", () => {
        resolve(JSON.parse(responseBody));
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    req.write(inputBody);
    req.end();
  });
}

function extractResourceId(arn) {
  let lastIndexOf = arn.lastIndexOf(":");
  if (lastIndexOf > 0) {
    return arn.substring(lastIndexOf + 1);
  }
}

exports.handler = async function (event) {
  const serviceUrl = event.serviceUrl;
  const callbackToken = event.token;
  const workflowId = extractResourceId(event.workflowExecutionArn);

  let options = url.parse(serviceUrl);
  options.method = "POST";

  await doRequest(
    options,
    JSON.stringify({
      workflowUrl: event.workflowUrl,
      workflowId,
      callbackToken,
    })
  );

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  };
};
