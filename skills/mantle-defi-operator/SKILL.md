---
name: mantle-defi-operator
title: Mantle DeFi Operator
version: 1.0.0
category: research
description: Research distribution venues on Mantle — liquidity, protocols, DeFi opportunities, venue comparison and execution planning.
runtime: agents/openai.yaml
triggers:
  always: false
  requires_action: false
  signals:
    - liquidity
    - distribution
    - venue
    - defi
    - trading
    - market
    - holder
    - secondary
    - swap
    - pool
    - routing
    - depth
    - amm
    - listing
required_inputs:
  - assetType
optional_inputs:
  - assetValue
  - distributionGoal
  - targetInvestors
expected_outputs:
  - liquidity_venues
  - routing_paths
  - venue_comparison
guardrails:
  - Do not make recommendations without evidence.
  - Never invent depth, slippage or APR figures — these require live measurement.
  - Compare venues on documented characteristics, not fabricated numbers.
---
# Mantle DeFi Operator

## Purpose
Researches how investors will actually acquire the asset: candidate liquidity venues, routing paths and DeFi distribution surfaces on Mantle, with a naive-vs-optimized execution view.

## Trigger Conditions
- Runs when the research objective matches any signal: liquidity, distribution, venue, defi, trading, market, holder, secondary, swap, pool, routing, depth, amm, listing.
- Skipped when no matching signal is present (reported as "Not Needed").

## Workflow
1. Identify candidate liquidity venues for the asset category on Mantle.
2. Map routing paths and compare venues on documented characteristics.
3. Draft an execution plan (primary pair, concentrated liquidity, routing).
4. Emit venues and routing as evidence; flag depth/slippage as needing live measurement.

## Guardrails
- Do not make recommendations without evidence.
- Never invent depth, slippage or APR figures — these require live measurement.
- Compare venues on documented characteristics, not fabricated numbers.

## Required Inputs
- assetType

## Optional Inputs
- assetValue
- distributionGoal
- targetInvestors

## Expected Outputs
- liquidity_venues
- routing_paths
- venue_comparison

## Runtime
Runtime configuration for this skill is defined in `agents/openai.yaml`. The orchestrator reads this file and uses it as the execution config.
