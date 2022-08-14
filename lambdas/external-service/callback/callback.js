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

exports.handler = async function (event) {
  const inputBody = JSON.parse(event.body);
  const workflowId = inputBody.workflowId;
  const workflowUrl = inputBody.workflowUrl + workflowId;
  const callbackToken = inputBody.callbackToken;

  let options = url.parse(workflowUrl);
  options.method = "PUT";

  await doRequest(
    options,
    JSON.stringify({
      callbackToken,
      status: "done",
      data: {
        servicePayload: ["foo", "bar"],
      },
    })
  );

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  };
};
