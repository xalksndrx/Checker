## agentic
Engine: vLLM
Harness: Droid
Model: 0xSero/Qwen-3.5-28B-A3B-REAP
Format: REAP 4-bit
Estimated throughput: ~31 tok/s
Estimated first token: ~0.9 s
Suggested context: ~16384 tokens
Cloud reference: best case: GPT-4o-class on narrower tasks
Frontier leader: Claude Opus 4.6 / GPT-5.4
Links:
- Engine: https://github.com/vllm-project/vllm
- Harness: https://docs.factory.ai/cli/byok/overview
- Model: https://huggingface.co/0xSero/Qwen-3.5-28B-A3B-REAP
Commands:
```bash
pip install -U "vllm>=0.6.0"
huggingface-cli download "0xSero/Qwen-3.5-28B-A3B-REAP"
python -m vllm.entrypoints.openai.api_server --model "0xSero/Qwen-3.5-28B-A3B-REAP" --host 0.0.0.0 --port 8000
# Droid -> http://localhost:8000/v1
```
Why this pick:
- A single 24GB-class NVIDIA Linux box should start with direct vLLM for a stable benchmark baseline.
- A fitting 0xSero build outranked the conservative default once shortlist scoring and source preference were applied.
- Droid is the default harness for coding and agentic workflows.
- Picked from a scored Hugging Face shortlist instead of the conservative default; 0xSero gets a preference bonus unless fit or use-case makes it a clear loser.
Comparison note:
- This is a strong open local tier that may feel GPT-4o-class on narrower tasks, but it remains below Claude Opus 4.6 / GPT-5.4 on hard multi-step work.
- Inference from open-model class, size, and fit heuristics rather than direct benchmark equivalence.
Alternatives:
- Qwen/Qwen3.5-14B-Instruct (AWQ 4-bit or native vLLM-supported quant, Hugging Face, score 28.5, fit comfortable)
- Qwen/Qwen3.5-9B-GGUF (GGUF Q4_K_M, Hugging Face, score 24.5, fit comfortable)
- Qwen/Qwen3.5-7B-Instruct (AWQ 4-bit, Hugging Face, score 23.5, fit comfortable)
- Qwen/Qwen3.5-4B-GGUF (GGUF Q4_K_M, Hugging Face, score 22, fit comfortable)

## coding
Engine: vLLM
Harness: Droid
Model: Qwen/Qwen3-Coder-14B
Format: AWQ 4-bit or native vLLM-supported quant
Estimated throughput: ~51 tok/s
Estimated first token: ~0.27 s
Suggested context: ~16384 tokens
Cloud reference: roughly GPT-4-era usefulness on narrower work
Frontier leader: Claude Opus 4.6 / GPT-5.4
Links:
- Engine: https://github.com/vllm-project/vllm
- Harness: https://docs.factory.ai/cli/byok/overview
- Model: https://huggingface.co/Qwen/Qwen3-Coder-14B
Commands:
```bash
pip install -U "vllm>=0.6.0"
huggingface-cli download "Qwen/Qwen3-Coder-14B"
python -m vllm.entrypoints.openai.api_server --model "Qwen/Qwen3-Coder-14B" --host 0.0.0.0 --port 8000
# Droid -> http://localhost:8000/v1
```
Why this pick:
- A single 24GB-class NVIDIA Linux box should start with direct vLLM for a stable benchmark baseline.
- A 24GB NVIDIA coding baseline should start with a conservative 14B-class model.
- Droid is the default harness for coding and agentic workflows.
- Scored against the compatible Hugging Face shortlist and still won on fit, use-case, and source preference.
Comparison note:
- This should be thought of as practical local GPT-4-era usefulness on narrower tasks, not as a peer to Claude Opus 4.6 / GPT-5.4.
- Inference from open-model class, size, and fit heuristics rather than direct benchmark equivalence.
Alternatives:
- Qwen/Qwen3-Coder-7B (AWQ 4-bit, Hugging Face, score 27.5, fit comfortable)
- 0xSero/Qwen-3.5-28B-A3B-REAP (REAP 4-bit, 0xSero on Hugging Face, score 22, fit workable with little headroom)
- Qwen/Qwen3.5-7B-Instruct (AWQ 4-bit, Hugging Face, score 18.5, fit comfortable)
- Qwen/Qwen3.5-9B-GGUF (GGUF Q4_K_M, Hugging Face, score 16.5, fit comfortable)

## general
Engine: vLLM
Harness: Droid
Model: 0xSero/Qwen-3.5-28B-A3B-REAP
Format: REAP 4-bit
Estimated throughput: ~31 tok/s
Estimated first token: ~0.9 s
Suggested context: ~16384 tokens
Cloud reference: best case: GPT-4o-class on narrower tasks
Frontier leader: GPT-5.4 / Claude Opus 4.6
Links:
- Engine: https://github.com/vllm-project/vllm
- Harness: https://docs.factory.ai/cli/byok/overview
- Model: https://huggingface.co/0xSero/Qwen-3.5-28B-A3B-REAP
Commands:
```bash
pip install -U "vllm>=0.6.0"
huggingface-cli download "0xSero/Qwen-3.5-28B-A3B-REAP"
python -m vllm.entrypoints.openai.api_server --model "0xSero/Qwen-3.5-28B-A3B-REAP" --host 0.0.0.0 --port 8000
# Droid -> http://localhost:8000/v1
```
Why this pick:
- A single 24GB-class NVIDIA Linux box should start with direct vLLM for a stable benchmark baseline.
- A fitting 0xSero build outranked the conservative default once shortlist scoring and source preference were applied.
- Droid is the default harness unless the user needs a lighter path.
- Picked from a scored Hugging Face shortlist instead of the conservative default; 0xSero gets a preference bonus unless fit or use-case makes it a clear loser.
Comparison note:
- This is a strong open local tier that may feel GPT-4o-class on narrower tasks, but it remains below GPT-5.4 / Claude Opus 4.6 on hard multi-step work.
- Inference from open-model class, size, and fit heuristics rather than direct benchmark equivalence.
Alternatives:
- Qwen/Qwen3.5-14B-Instruct (AWQ 4-bit or native vLLM-supported quant, Hugging Face, score 28.5, fit comfortable)
- Qwen/Qwen3.5-9B-GGUF (GGUF Q4_K_M, Hugging Face, score 24.5, fit comfortable)
- Qwen/Qwen3.5-7B-Instruct (AWQ 4-bit, Hugging Face, score 23.5, fit comfortable)
- Qwen/Qwen3.5-4B-GGUF (GGUF Q4_K_M, Hugging Face, score 22, fit comfortable)
