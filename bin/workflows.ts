#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { WorkflowsStack } from "../lib/workflows-stack";

const app = new cdk.App();
new WorkflowsStack(app, "WorkflowsStack");
