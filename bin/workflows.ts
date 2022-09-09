#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { WorkflowsLambdaStack } from "../lib/workflows-lambda";
import { WorkflowsStack } from "../lib/workflows-stack";

const app = new cdk.App();

new WorkflowsLambdaStack(app, "WorkflowsLambdaStack");
new WorkflowsStack(app, "WorkflowsStack");
