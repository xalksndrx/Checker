# LLM Checker

One script analyzes the machine and tells you what local LLM stack to run.

## Run

```bash
npm install
node bin/checker.js
```

That single run prints:

- your hardware summary
- the recommended stack for `agentic`
- the recommended stack for `coding`
- the recommended stack for `general`
- engine
- harness
- primary Hugging Face model
- Hugging Face alternatives
- estimated `tok/s`
- estimated first-token latency
- suggested context window

It also overwrites [`install.md`](./install.md) with an agent-ready install plan.

## Root Files

The user-facing files in the repo root are:

- [`README.md`](./README.md)
- [`guide.md`](./guide.md)
- [`benchmark.md`](./benchmark.md)
- [`install.md`](./install.md)

## Optional Inputs

Simulate another machine:

```bash
node bin/checker.js --simulate rtx4090 --no-verbose
node bin/checker.js --simulate phone_mid --no-verbose
```

`--simulate` does not inspect your real machine. It swaps in a built-in hardware profile so you can preview what the tool would recommend for another class of system, like a 4090 desktop, Apple Silicon Mac, CPU-only box, or phone.

List simulation profiles:

```bash
node bin/checker.js --simulate list
```

Override with custom hardware values:

```bash
node bin/checker.js --gpu "RTX 4090" --ram 64 --cpu "Ryzen 9 7950X" --vram 24
```

## How It Works

`checker.js` is the whole product surface.

It:

1. detects hardware
2. applies the rules in [`guide.md`](./guide.md)
3. chooses engine, harness, and model for `agentic`, `coding`, and `general`
4. estimates expected performance
5. writes [`install.md`](./install.md)

The recommendations are guide-driven and hardware-aware. They are not limited to 0xSero models, but 0xSero Hugging Face releases are preferred when the guide logic says they are the best fit.

## Performance Output

The printed `tok/s`, first-token latency, and context window are heuristic estimates. Use [`benchmark.md`](./benchmark.md) to record measured real-world results for your machine and compare them against the estimate.

## Install Plan

Every run rewrites [`install.md`](./install.md) with:

- engine link
- harness link
- model link
- install command
- model fetch command
- serve command
- sections for `agentic`, `coding`, and `general`
