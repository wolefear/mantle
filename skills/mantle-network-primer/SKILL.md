---
name: mantle-network-primer
title: Mantle Network Primer
version: 1.0.0
category: grounding
description: Verify Mantle-specific network assumptions before any analysis. Chain IDs, gas token, RPC endpoints, settlement and infrastructure only — never analytics.
runtime: agents/openai.yaml
triggers:
  always: false
  requires_action: false
  signals:
    - infrastructure
    - infra
    - chain
    - chainid
    - gas
    - rpc
    - settlement
    - network
    - bridge
    - cross-chain
    - crosschain
    - l2
    - rollup
    - primer
    - assumptions
required_inputs:
  - (none)
optional_inputs:
  - assetType
  - launchStage
expected_outputs:
  - network_assumptions
  - settlement_profile
guardrails:
  - Never use this skill for analytics, trends or wallet data.
  - Never invent chain parameters — report only verified Mantle network facts.
  - State explicitly when a parameter must be confirmed against a live RPC.
---
# Mantle Network Primer

## Purpose
Establishes the ground truth about the Mantle network so every downstream recommendation is anchored to real infrastructure (an EVM L2, chainId 5000, low fees suited to frequent distribution and secondary trading).

## Trigger Conditions
- Runs when the research objective matches any signal: infrastructure, infra, chain, chainid, gas, rpc, settlement, network, bridge, cross-chain, crosschain, l2, rollup, primer, assumptions.
- Skipped when no matching signal is present (reported as "Not Needed").

## Workflow
1. Read the research objective and detect infrastructure assumptions that must hold.
2. Verify Mantle network parameters (chainId, gas token, settlement, fee profile).
3. Emit network assumptions as evidence and flag anything requiring live RPC confirmation.

## Guardrails
- Never use this skill for analytics, trends or wallet data.
- Never invent chain parameters — report only verified Mantle network facts.
- State explicitly when a parameter must be confirmed against a live RPC.

## Required Inputs
- (none)

## Optional Inputs
- assetType
- launchStage

## Expected Outputs
- network_assumptions
- settlement_profile

## Runtime
Runtime configuration for this skill is defined in `agents/openai.yaml`. The orchestrator reads this file and uses it as the execution config.
