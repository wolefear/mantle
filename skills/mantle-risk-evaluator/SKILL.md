---
name: mantle-risk-evaluator
title: Mantle Risk Evaluator
version: 1.0.0
category: guardrail
description: Evaluate whether recommendations are safe. Emits PASS, WARN or BLOCK. Every recommendation requiring user action should be checked by this skill.
runtime: agents/openai.yaml
triggers:
  always: false
  requires_action: true
  signals:
    - risk
    - safety
    - compliance
    - block
    - warn
    - validate
required_inputs:
  - (none)
optional_inputs:
  - targetRegion
  - launchStage
  - assetValue
expected_outputs:
  - risk_verdict
  - risk_flags
guardrails:
  - Every actionable recommendation must pass through this skill.
  - Prefer WARN over silent PASS when inputs are missing.
  - BLOCK when a recommendation would be unsafe without validation.
---
# Mantle Risk Evaluator

## Purpose
The safety gate. Screens distribution and protocol risk across liquidity, market, adoption, infrastructure and operational dimensions, and returns a PASS / WARN / BLOCK verdict that gates every actionable recommendation.

## Trigger Conditions
- Runs when the research objective matches any signal: risk, safety, compliance, block, warn, validate.
- Runs whenever the session will produce actionable recommendations.

## Workflow
1. Screen the proposed distribution across five risk dimensions.
2. Assign a gate verdict: PASS, WARN or BLOCK.
3. Record flags and residual uncertainty where inputs are missing.
4. Emit the verdict and flags as evidence for the reasoning engine.

## Guardrails
- Every actionable recommendation must pass through this skill.
- Prefer WARN over silent PASS when inputs are missing.
- BLOCK when a recommendation would be unsafe without validation.

## Required Inputs
- (none)

## Optional Inputs
- targetRegion
- launchStage
- assetValue

## Expected Outputs
- risk_verdict
- risk_flags

## Runtime
Runtime configuration for this skill is defined in `agents/openai.yaml`. The orchestrator reads this file and uses it as the execution config.
