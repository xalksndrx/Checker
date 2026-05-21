# Install Plan

## Model download workflow

Use the modern Hugging Face CLI entrypoint for model downloads. Do not use `huggingface-cli download` for new runs.

One-time Hugging Face auth:
```bash
hf auth login
hf auth whoami
```

Run long downloads inside `tmux` so they survive terminal disconnects:
```bash
tmux new-session -s modeldl
# run the model-specific hf download command from the relevant section below
# detach with Ctrl-b then d
tmux attach -t modeldl
```

Download and resume rules:

- Use `hf download "<model>" --local-dir "<model-dir>"`.
- Re-run the exact same `hf download` command to resume partial downloads.
- Keep existing `.incomplete` files unless you intentionally want to restart from zero.
- Prefer authenticated downloads for large model shards because anonymous Hub downloads can be slower and less reliable.

## agentic
Engine: vLLM
Harness: Droid
Model: cyankiwi/Qwen3.6-27B-AWQ-INT4
Format: AWQ 4-bit
Estimated throughput: ~32 tok/s
Estimated first token: ~0.84 s
Suggested context: ~16384 tokens
Cloud reference: roughly GPT-4-era usefulness on narrower work
Frontier leader: Claude Opus 4.6 / GPT-5.4
Links:
- Engine: https://github.com/vllm-project/vllm
- Harness: https://docs.factory.ai/cli/byok/overview
- Model: https://huggingface.co/cyankiwi/Qwen3.6-27B-AWQ-INT4
Commands:
```bash
pip install -U "vllm>=0.15.0"
hf download "cyankiwi/Qwen3.6-27B-AWQ-INT4" --local-dir "../models/cyankiwi-Qwen3.6-27B-AWQ-INT4"
vllm serve "../models/cyankiwi-Qwen3.6-27B-AWQ-INT4" --host 0.0.0.0 --port 8000 --max-model-len 32768 --gpu-memory-utilization 0.92
# Droid -> http://localhost:8000/v1
```
Progress check:
```bash
export MODEL_DIR="../models/cyankiwi-Qwen3.6-27B-AWQ-INT4"
watch -n 5 'du -sh "$MODEL_DIR"'
watch -n 5 'find "$MODEL_DIR/.cache/huggingface/download" -maxdepth 1 -type f -name "*.incomplete" -printf "%f %s\n" 2>/dev/null | sort'
```
Why this pick:
- A single 24GB-class NVIDIA Linux box should use direct vLLM for the best one-model baseline when a strong quantized model fits.
- This model led the live Hugging Face discovery results after scoring hardware fit, use-case alignment, recency, popularity, and runtime compatibility.
- Droid is the default harness for coding and agentic workflows.
- Picked from a scored Hugging Face shortlist instead of the conservative default.
Comparison note:
- This should be thought of as practical local GPT-4-era usefulness on narrower tasks, not as a peer to Claude Opus 4.6 / GPT-5.4.
- Inference from open-model class, size, and fit heuristics rather than direct benchmark equivalence.

## coding
Engine: vLLM
Harness: Droid
Model: Qwen/Qwen2.5-Coder-32B-Instruct-AWQ
Format: AWQ 4-bit
Estimated throughput: ~28 tok/s
Estimated first token: ~1.17 s
Suggested context: ~16384 tokens
Cloud reference: best case: GPT-4o-class on narrower tasks
Frontier leader: Claude Opus 4.6 / GPT-5.4
Links:
- Engine: https://github.com/vllm-project/vllm
- Harness: https://docs.factory.ai/cli/byok/overview
- Model: https://huggingface.co/Qwen/Qwen2.5-Coder-32B-Instruct-AWQ
Commands:
```bash
pip install -U "vllm>=0.15.0"
hf download "Qwen/Qwen2.5-Coder-32B-Instruct-AWQ" --local-dir "../models/Qwen-Qwen2.5-Coder-32B-Instruct-AWQ"
vllm serve "../models/Qwen-Qwen2.5-Coder-32B-Instruct-AWQ" --host 0.0.0.0 --port 8000 --max-model-len 32768 --gpu-memory-utilization 0.92
# Droid -> http://localhost:8000/v1
```
Progress check:
```bash
export MODEL_DIR="../models/Qwen-Qwen2.5-Coder-32B-Instruct-AWQ"
watch -n 5 'du -sh "$MODEL_DIR"'
watch -n 5 'find "$MODEL_DIR/.cache/huggingface/download" -maxdepth 1 -type f -name "*.incomplete" -printf "%f %s\n" 2>/dev/null | sort'
```
Why this pick:
- A single 24GB-class NVIDIA Linux box should use direct vLLM for the best one-model baseline when a strong quantized model fits.
- This model led the live Hugging Face discovery results after scoring hardware fit, use-case alignment, recency, popularity, and runtime compatibility.
- Droid is the default harness for coding and agentic workflows.
- Picked from a scored Hugging Face shortlist instead of the conservative default.
Comparison note:
- This is a strong open local tier that may feel GPT-4o-class on narrower tasks, but it remains below Claude Opus 4.6 / GPT-5.4 on hard multi-step work.
- Inference from open-model class, size, and fit heuristics rather than direct benchmark equivalence.

## general
Engine: vLLM
Harness: Droid
Model: QuantTrio/Qwen3-VL-30B-A3B-Instruct-AWQ
Format: AWQ 4-bit
Estimated throughput: ~51 tok/s
Estimated first token: ~0.27 s
Suggested context: ~16384 tokens
Cloud reference: best case: GPT-4o-class on narrower tasks
Frontier leader: GPT-5.4 / Claude Opus 4.6
Links:
- Engine: https://github.com/vllm-project/vllm
- Harness: https://docs.factory.ai/cli/byok/overview
- Model: https://huggingface.co/QuantTrio/Qwen3-VL-30B-A3B-Instruct-AWQ
Commands:
```bash
pip install -U "vllm>=0.15.0"
hf download "QuantTrio/Qwen3-VL-30B-A3B-Instruct-AWQ" --local-dir "../models/QuantTrio-Qwen3-VL-30B-A3B-Instruct-AWQ"
vllm serve "../models/QuantTrio-Qwen3-VL-30B-A3B-Instruct-AWQ" --host 0.0.0.0 --port 8000 --max-model-len 32768 --gpu-memory-utilization 0.92
# Droid -> http://localhost:8000/v1
```
Progress check:
```bash
export MODEL_DIR="../models/QuantTrio-Qwen3-VL-30B-A3B-Instruct-AWQ"
watch -n 5 'du -sh "$MODEL_DIR"'
watch -n 5 'find "$MODEL_DIR/.cache/huggingface/download" -maxdepth 1 -type f -name "*.incomplete" -printf "%f %s\n" 2>/dev/null | sort'
```
Why this pick:
- A single 24GB-class NVIDIA Linux box should use direct vLLM for the best one-model baseline when a strong quantized model fits.
- This model led the live Hugging Face discovery results after scoring hardware fit, use-case alignment, recency, popularity, and runtime compatibility.
- Droid is the default harness unless the user needs a lighter path.
- Picked from a scored Hugging Face shortlist instead of the conservative default.
Comparison note:
- This is a strong open local tier that may feel GPT-4o-class on narrower tasks, but it remains below GPT-5.4 / Claude Opus 4.6 on hard multi-step work.
- Inference from open-model class, size, and fit heuristics rather than direct benchmark equivalence.
