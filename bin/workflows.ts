#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { WorkflowsLambdaStack } from "../lib/workflows-lambda";
import { WorkflowIdempotentStack } from "../lib/workflows-idempotent";
import { WorkflowsStack } from "../lib/workflows-stack";

const app = new cdk.App();

new WorkflowsLambdaStack(app, "WorkflowsLambdaStack");
new WorkflowIdempotentStack(app, "WorkflowIdempotentStack");
new WorkflowsStack(app, "WorkflowsStack");
