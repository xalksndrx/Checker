# Local LLM Benchmark Spec

## Goal

Create a benchmark that reflects actual use:

- visual assessment
- agentic workflow
- coding and data handling
- blunt factual writing
- lightweight browser game building

This benchmark is not trying to produce a single numeric score. It is trying to produce artifacts that are easy to inspect side by side across models.

## Output philosophy

Each benchmark run should produce:

1. one folder containing the raw model outputs for that run
2. one markdown report summarizing the run metadata and linking to the outputs

The raw outputs matter more than the report.

## Required files

Agents implementing this benchmark should produce at least:

- `benchmark.md`
- a per-run output folder

Recommended layout:

```text
benchmarks/
  runs/
    2026-04-06_model-name_engine-name/
      run_report.md
      metadata.json
      prompt_task1.txt
      response_task1.txt
      task1_visual_assessment.md
      prompt_task2.txt
      response_task2.txt
      task2_youtube_summary.md
      prompt_task3.txt
      response_task3.txt
      task3_btc_ema.md
      task3_btc_ema.png
      task3_btc_ema.csv
      prompt_task4.txt
      response_task4.txt
      task4_roman_emperor.md
      prompt_task5.txt
      response_task5.txt
      task5_ascii_space_invaders.md
      task5_ascii_space_invaders_url.txt
      timings.json
  benchmark.md
```

`benchmark.md` is the spec and high-level log.

Each run folder holds the actual model outputs.

## Required metadata per run

Every run must capture:

- date and local time
- model name
- model revision if known
- engine name
- quant format
- context length
- max tokens
- temperature
- top_p if used
- seed if supported
- hardware note
- runtime notes or errors
- prompt tokens if available
- completion tokens if available
- total tokens if available
- average tokens per second if available
- time to first token if available
- per-task wall-clock duration
- total wall-clock duration

## Benchmark command shape

The benchmark runner should be able to execute either:

- all tasks in one run
- one specific task in isolation

Suggested CLI shape:

```bash
python3 run_benchmark.py \
  --model "MODEL_NAME" \
  --engine "vllm" \
  --base-url "http://127.0.0.1:8000/v1" \
  --outdir "./benchmarks/runs"
```

Optional:

```bash
python3 run_benchmark.py ... --task task2 --ytlink "..." --prompt-file "./prompt.md"
```

The benchmark runner should talk to a local OpenAI-compatible endpoint if possible. That keeps it reusable across `vLLM`, `ExLlama`, or anything else wrapped behind the same API shape.

Each task must also be runnable directly while still inheriting:

- timing
- run metadata
- raw prompt and response capture
- the embedded benchmark ruleset in this file

The benchmark should support both:

```bash
python3 run_benchmark.py ... --task task3
```

and a task-local script shape if an implementing agent chooses to break work apart.

## Evaluation rules

Across all tasks:

- save the exact prompt sent to the model
- save the raw response exactly as returned
- do not hand-edit model outputs
- record failures honestly
- if a task needs tools, log each tool step and whether it succeeded
- time the task from start to finish
- log any available token usage and throughput metrics

Each task should produce timing data even when it fails.

Judge models manually after the run.

## Timing and performance requirements

Every benchmark and every individual task run must record:

- start timestamp
- end timestamp
- total wall-clock seconds
- model call count
- prompt tokens if the provider reports them
- completion tokens if the provider reports them
- total generated tokens if the provider reports them
- average tokens per second if the provider reports them or if they can be computed reliably
- time to first token if the endpoint exposes streaming timing

If a provider does not expose token metrics, the benchmark must say so plainly instead of fabricating them.

Suggested `timings.json` shape:

```json
{
  "run_started_at": "2026-04-06T18:00:00-07:00",
  "run_finished_at": "2026-04-06T18:14:12-07:00",
  "run_duration_seconds": 852.1,
  "tasks": {
    "task1": {
      "duration_seconds": 91.3,
      "prompt_tokens": 812,
      "completion_tokens": 642,
      "total_tokens": 1454,
      "tokens_per_second": 42.8,
      "time_to_first_token_ms": 520
    }
  }
}
```

## Embedded Agent Rules

All benchmark code and task implementations should follow this ruleset.

### Rules

- Never read or edit `.env` files.

### Style Guide

- Never add comments to code.
- The code itself and variable names should be self-explanatory.
- Write simple clear code that is easy to skim.
- Minimize possible states by reducing number of arguments and narrowing state.
- Use discriminated unions to reduce number of states the code can be in.
- Exhaustively handle any objects with multiple different types and fail on unknown type.
- Don't write defensive code; assume the values are what the types say they are.
- Use asserts when loading data and be opinionated about parameters.
- Do not let things be optional if not strictly required.
- Remove any changes that are not strictly required.
- Bias for fewer lines of code.
- No overly complex or clever code.
- Don't break things out into too many functions.
- Early returns are great.
- Use asserts instead of try/catch or default values when something is expected to exist.
- Do not use `try`/`except` unless a network boundary absolutely requires graceful handling.
- Never pass overrides except when strictly necessary.
- Keep argument count low.
- Don't make arguments optional if they are actually required.

### Security

- Security and abuse prevention are of the utmost importance.
- Make sure exploitable code is never added.

### Benchmark instruction

Every task implementation should be judged against both:

- whether it completed the benchmark task
- whether it respected the embedded rules above

The benchmark should record any obvious rules violations in the task markdown output or run report.

## Task 1: Visual Site Assessment

### Purpose

Test grounded visual judgment, honesty, taste, and the ability to critique real work without hiding behind vague praise.

### Task

The agent should:

1. open `https://alksndr.com` in a browser
2. capture screenshots into a temporary folder
3. inspect the screenshots
4. write an honest assessment in the voice of a professional VFX art director
5. remove the temporary screenshot folder after the final markdown artifact is created

### Output file

`task1_visual_assessment.md`

### Required content

The output must include:

- first impression
- art direction assessment
- typography assessment
- layout and hierarchy assessment
- motion or cinematic feel if observable
- what feels amateur or unresolved
- what feels strong or intentional
- three concrete improvements

### Constraints

- no fake praise
- no generic UX filler
- no pretending to see things that are not visible
- if the screenshots are insufficient, say so clearly
- temporary files must be deleted after the output is written

### What good looks like

Good output is sharp, specific, visually literate, and slightly unforgiving in a useful way.

## Task 2: YouTube Transcript Summary

### Purpose

Test tool use, argument extraction, instruction following, cleanup discipline, and useful summarization.

### Desired script shape

The user wants a separate script with this style:

```bash
python3 summarize.py --ytlink "YOUTUBE_URL" --prompt-file "./prompt.md"
```

### Expected behavior

The script should:

1. validate that the YouTube URL is usable
2. validate that the prompt file exists
3. fetch the transcript
4. summarize the transcript according to the prompt file
5. save only the final summary as `DATE_NAMEOFVID.md`
6. delete temporary artifacts after completion

### Output file

`task2_youtube_summary.md` in the run folder should contain:

- the command used
- the source video URL
- whether transcript retrieval succeeded
- the generated filename
- the raw model summary or a pointer to it

The actual summary artifact should be named like:

`2026-04-06_NAME-OF-VIDEO.md`

### Constraints

- transcript source must be logged
- if transcript fetch fails, the failure must be recorded, not hidden
- the saved summary should be the only retained task artifact outside the run log
- no leftover transcript files

### What good looks like

Good output follows the prompt tightly, captures the actual content of the video, and does not invent details missing from the transcript.

## Task 3: Bitcoin EMA Strategy Build

### Purpose

Test coding, reasoning, data acquisition, chart generation, and whether the model can turn a fuzzy request into a working artifact.

### Task

The agent should build a script that:

1. fetches daily Bitcoin price data from a documented public source
2. creates a daily price chart
3. overlays 9 EMA and 21 EMA
4. places a green upward triangle at buy points where the 9 EMA crosses above the 21 EMA
5. places a red downward triangle at sell points where the 9 EMA crosses below the 21 EMA
6. shows total strategy performance in a chart corner
7. saves the chart and supporting data

### Preferred output files

- `task3_btc_ema.md`
- `task3_btc_ema.png`
- `task3_btc_ema.csv`

### Required content in markdown

The markdown should include:

- data source used
- date range
- exact crossover rule
- whether signals were generated on close or next-bar execution
- total return of buy-and-hold
- total return of crossover strategy
- any assumptions

### Constraints

- the model must identify and use a real price data source
- the result must be reproducible
- the performance figure must state how it was calculated
- if the model cannot fetch data, it must explain the blocker clearly

### What good looks like

Good output is not just code that almost works. It produces a chart, documents assumptions, and does not blur the difference between signal generation and strategy execution.

## Task 4: Roman Emperor Fact Test

### Purpose

Test factual recall, style restraint, and the ability to answer directly without padding.

### Task

Prompt the model to write exactly three paragraphs on a cool emperor from Ancient Rome.

Requirements:

- pick one emperor at random or near-random
- include real facts
- focus on one cool story, event, battle, reform, or strange episode
- no fake drama
- no fluff
- no modern motivational tone

### Output file

`task4_roman_emperor.md`

### Success criteria

The result should:

- be readable and direct
- contain concrete factual detail
- avoid obvious historical hallucinations
- feel interesting without overselling

## Task 5: ASCII Space Invaders In The Browser

### Purpose

Test open-ended coding, browser output, simplicity discipline, and whether the model can finish a tiny playable artifact instead of writing a lot of talk.

### Task

The agent should build a very simple browser game inspired by Space Invaders using ASCII-style rendering.

Requirements:

- it must run in a browser
- it must expose a URL when done
- left and right arrows move the player
- space restarts the game
- the scope should stay extremely simple
- ASCII presentation matters more than polish

Allowed simplifications:

- enemies can move as one block
- collision logic can be basic
- score can be minimal
- visuals can be plain monospace text

### Output files

- `task5_ascii_space_invaders.md`
- `task5_ascii_space_invaders_url.txt`

### Required content in markdown

The output must include:

- where the game files were created
- what URL was produced
- controls
- what is implemented
- what was intentionally left simple
- whether the game was actually opened and verified in a browser

### Constraints

- do not overbuild it
- do not replace ASCII style with canvas art unless ASCII is still the clear visual language
- the final artifact must be runnable
- if a local server is required, document how it was started

### What good looks like

Good output is a tiny working toy that actually runs and can be judged quickly.

## Suggested prompt discipline

To keep runs comparable:

- use fixed system prompts per task
- use fixed sampling settings for a whole benchmark pass
- avoid adding helper hints mid-run
- if a retry is needed, log it

## Manual judging rubric

Use human judgment after each run.

Suggested categories:

- honesty
- specificity
- taste
- factual reliability
- tool competence
- cleanup discipline
- code usefulness
- speed on your hardware
- finish rate
- whether you would trust the model again

Simple 1 to 5 scoring is enough if you want a number.

## Recommended adjustment to the benchmark

Keep the five tasks, but add these internal rules:

- every task must preserve the raw prompt and raw response in the run folder before any cleanup
- every task must record timing
- every task must attempt to record token metrics and throughput when the endpoint exposes them
- every task must follow the embedded ruleset in this file

Reason:

- this makes later side-by-side comparison much easier
- it prevents polished summaries from hiding weak raw behavior
- it lets you compare not just quality but runtime cost and speed

## Implementation notes for later agents

Agents implementing this benchmark should:

1. keep the benchmark engine-agnostic
2. target a local OpenAI-compatible endpoint
3. create one run folder per model execution
4. preserve raw prompts and outputs
5. record timing for every task and the total run
6. capture token usage and tokens per second when available
7. enforce the embedded ruleset in this file
8. clean up temporary tool artifacts
9. fail loudly and log blockers instead of silently skipping work

## Final benchmark shape

This benchmark is good because it hits five different failure modes:

- visual bullshit detection
- transcript and summarization workflow
- real coding plus charting
- plain factual writing
- open-ended interactive browser coding

That is enough to tell whether a model is useful for your actual workflow.
