# vLLM Plan For The 4090 Box

## Goal

Run modern Hugging Face models on a single machine with:

- 1x RTX 4090
- 24 GB VRAM
- 128 GB RAM
- local access over SSH/Tailscale
- likely single-user or low-concurrency use at first

This document is intentionally streamlined around `vLLM`.

## Decision

Use `vLLM`.

Do not optimize around other engines yet. There are other valid options, but they are out of scope until there is a concrete reason to evaluate them.

## Why `vLLM`

`vLLM` is the right starting point here because:

- it is a serious serving runtime, not just a local toy
- it exposes an OpenAI-compatible API, which fits the likely next step of calling it from other machines
- it has strong scheduler behavior and KV-cache handling
- it gives a stable baseline for benchmarking multiple models over time
- it keeps the stack simple while you are still learning the model landscape

For this machine, the priority is not maximum theoretical throughput. The priority is a clean, repeatable, practical local server.

## Hardware reality

The 4090 is strong, but 24 GB VRAM is still the main constraint.

That means:

- 7B to 14B dense models are the safest baseline
- larger quantized models may work, but context length and KV cache will become the real pressure point
- long-context tests are expensive even when the model weights fit
- system RAM helps with downloads, staging, browser tooling, and general machine comfort, but it does not replace VRAM bandwidth

The main bottlenecks to respect are:

- VRAM capacity
- memory bandwidth
- KV-cache growth
- context length
- model quantization quality

## Operating principle

Standardize on one runtime first:

1. get `vLLM` stable
2. benchmark multiple models through the same API
3. compare model quality under fixed settings
4. only evaluate other engines later if there is a specific problem to solve

This matters because otherwise you end up benchmarking runtimes, formats, and prompts all at once and learn nothing cleanly.

## Environment

Use `uv` and a dedicated virtual environment for `vLLM`.

Suggested structure:

```text
~/llm/
  vllm/
  models/
  benchmarks/
```

Keep the environment pinned once it works.

Rules:

- avoid ad hoc package drift
- pin `vllm`, `torch`, and CUDA-compatible dependencies together
- keep benchmark tooling separate from random experiments

## CUDA and kernels

For this box, the intended path is:

- NVIDIA CUDA
- `vLLM`
- the fastest supported attention path available in the chosen stack

General rules:

- prefer the current stable `vLLM` release that supports your model and quant format cleanly
- keep CUDA, PyTorch, and `vLLM` versions aligned
- once a version set works, stop touching it unless there is a reason

Treat kernel choice as part of stack stability, not as a hobby project.

## Quantization guidance

Quantization matters a lot on 24 GB VRAM.

Rules:

- prefer quant formats well supported by `vLLM`
- log quant format for every benchmark run
- do not compare a bad quant against a better quant and pretend it is a model comparison
- keep context length fixed when comparing models
- keep sampling settings fixed when comparing models

Practical priority:

1. get one strong model running correctly
2. benchmark the same model or close variants at fixed settings
3. expand only after the benchmark flow is stable

## Model size guidance

For practical use on this machine:

- treat 7B to 14B as the main lane
- treat bigger quantized models as deliberate experiments
- be conservative with large advertised context windows

Do not pick models just because they are new or large. Pick models that are likely to matter for:

- code generation
- tool use
- instruction following
- summarization
- factual writing

## Serving priorities

Optimize in this order:

1. stable startup
2. correct model loading
3. usable context length
4. repeatable benchmark behavior
5. tokens per second
6. concurrency

You do not need to optimize for many users yet.

## Tuning priorities

### Context

Do not chase maximum context early.

Use a realistic baseline context for benchmarks, then test extended context separately.

Why:

- KV cache grows fast
- long context can wreck latency before it causes a hard failure

### Sampling

For benchmark consistency, use conservative sampling.

Suggested baseline:

- low temperature for coding and factual tasks
- fixed seed when supported
- avoid changing generation settings between models

### Concurrency

Start by testing one request at a time.

You care more about:

- output quality
- latency
- consistency

than about high-throughput batching right now.

## Recommended workflow

Phase 1:

- install and stabilize `vLLM`
- validate one strong baseline model
- confirm local API calls work

Phase 2:

- run the four-task benchmark
- save raw prompts and raw outputs
- compare models under fixed settings

Phase 3:

- only after that, explore different models, quant formats, and larger contexts

## Benchmarking rule

The benchmark harness should stay engine-agnostic if possible, but the implementation target right now is `vLLM`.

That means:

- use a local OpenAI-compatible endpoint
- log model, quant, context, and sampling every run
- preserve raw outputs before cleanup

## Final recommendation

For this 4090 box, use `vLLM` and keep the plan simple.

Do not split attention across engines yet.

The important variables right now are:

- model choice
- quant quality
- context length
- KV-cache pressure
- repeatability of the benchmark

That is enough to get useful results without adding more moving parts.
