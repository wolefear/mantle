---
name: mantle-data-indexer
title: Mantle Data Indexer
version: 1.0.0
category: research
description: Historical Mantle ecosystem research — the primary research skill. Wallet activity, protocol activity, historical trends, time-window analytics and distribution patterns.
runtime: agents/openai.yaml
triggers:
  always: true
  requires_action: false
  signals:
    - historical
    - wallet
    - protocol
    - trend
    - comparable
    - ecosystem
    - distribution
    - activity
    - adoption
    - holders
required_inputs:
  - assetType
optional_inputs:
  - targetRegion
  - launchStage
  - distributionGoal
expected_outputs:
  - comparable_assets
  - ecosystem_map
  - distribution_patterns
guardrails:
  - Never fabricate on-chain statistics, TVL, volumes or wallet counts.
  - Findings are qualitative unless a live indexer endpoint is connected.
  - Every quantitative claim must be labelled as requiring live indexing.
---
# Mantle Data Indexer

## Purpose
The primary research skill. Benchmarks comparable tokenized assets and assembles an ecosystem/protocol map so distribution expectations are grounded in how similar assets actually behave on Mantle.

## Trigger Conditions
- Always runs (baseline research skill).
- Skipped when no matching signal is present (reported as "Not Needed").

## Workflow
1. Classify the asset and derive the research objective.
2. Shortlist comparable tokenized assets to benchmark distribution patterns.
3. Assemble an ecosystem protocol map of relevant distribution surfaces.
4. Emit comparables and ecosystem map as evidence; flag metrics that need live indexing.

## Guardrails
- Never fabricate on-chain statistics, TVL, volumes or wallet counts.
- Findings are qualitative unless a live indexer endpoint is connected.
- Every quantitative claim must be labelled as requiring live indexing.

## Required Inputs
- assetType

## Optional Inputs
- targetRegion
- launchStage
- distributionGoal

## Expected Outputs
- comparable_assets
- ecosystem_map
- distribution_patterns

## Runtime
Runtime configuration for this skill is defined in `agents/openai.yaml`. The orchestrator reads this file and uses it as the execution config.
