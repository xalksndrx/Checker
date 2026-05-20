# LLM Checker

One script analyzes the machine and tells you what local LLM stack to run.

## Run

```bash
npm install
node bin/checker.js
```

For heavier live discovery, set a Hugging Face token so the API does not throttle anonymous searches:

```bash
export HF_TOKEN="hf_..."
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
- top ranked 3-5 model choices for each lane
- best uncensored / abliterated / heretic choices when discovered
- run labels such as `confirmed`, `likely`, `experimental`, or `format mismatch`
- tradeoff notes for quality, speed, fit, and context headroom
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

Compare explicit model links or repo IDs against the current machine:

```bash
node bin/checker.js --use-case general \
  --models https://huggingface.co/org/model-one,https://huggingface.co/org/model-two
```

Or repeat `--model`:

```bash
node bin/checker.js --use-case coding \
  --model org/model-one \
  --model https://huggingface.co/org/model-two
```

Limit the recommendation list:

```bash
node bin/checker.js --top 5
```

That comparison mode:

- fetches Hugging Face repo metadata when possible
- estimates parameter count and working-set size
- checks fit against the detected hardware
- ranks the provided models using the same Checker fit logic
- prints context and performance tradeoffs for the compared set
- does not rewrite `install.md`

## How It Works

`checker.js` is the whole product surface.

It:

1. detects hardware
2. applies the rules in [`guide.md`](./guide.md)
3. chooses engine and harness for `agentic`, `coding`, and `general`
4. discovers and ranks candidate models from live Hugging Face search results
5. prefers the strongest practical one-model setup for the detected hardware before narrower specialist or offload experiments
6. estimates expected performance and context tradeoffs
7. writes [`install.md`](./install.md)

The recommendations are guide-driven and hardware-aware, but the model candidates are discovery-first. The checker searches Hugging Face live for strong general, coding, agentic, tool-use, multimodal, and uncensored variants, then ranks what it finds against the detected hardware and selected runtime.

Discovery is live and broad, not a hardcoded model list: it queries Hugging Face by task filters, popularity, recency, likes, and use-case terms, dedupes the results, enriches top candidates with repo metadata, and scores the bounded candidate pool locally. It is not a literal crawl of every Hugging Face repo on every run, because that would be slow, rate-limited, and unsuitable for a hosted app.

Current CLI options:

```text
--simulate <profile>   Simulate a saved hardware profile
--gpu <model>          Simulate a custom GPU
--ram <gb>             Simulate RAM in GB
--cpu <model>          Simulate a custom CPU
--vram <gb>            Override GPU VRAM in GB
--use-case <name>      Evaluate for general, coding, or agentic
--top <n>              Show top ranked choices (default: 5, max: 10)
--model <id-or-url>    Evaluate an explicit model candidate (repeatable)
--models <list>        Comma-separated explicit model IDs or HF URLs
--no-verbose           Disable step-by-step progress
-h, --help             Show this help
-V, --version          Show package version
```

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
- top ranked alternatives
- run-suitability labels
- tradeoff summaries
- sections for `agentic`, `coding`, and `general`
