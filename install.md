## agentic
Engine: vLLM
Harness: Droid
Model: cyankiwi/Qwen3.6-27B-AWQ-INT4
Format: AWQ 4-bit
Estimated throughput: ~32 tok/s
Estimated first token: ~0.84 s
Suggested context: ~32768 tokens
Cloud reference: roughly GPT-4-era usefulness on narrower work
Frontier leader: Claude Opus 4.6 / GPT-5.4
Links:
- Engine: https://github.com/vllm-project/vllm
- Harness: https://docs.factory.ai/cli/byok/overview
- Model: https://huggingface.co/cyankiwi/Qwen3.6-27B-AWQ-INT4
Commands:
```bash
pip install -U "vllm>=0.15.0"
huggingface-cli download "cyankiwi/Qwen3.6-27B-AWQ-INT4"
vllm serve "cyankiwi/Qwen3.6-27B-AWQ-INT4" --host 0.0.0.0 --port 8000 --max-model-len 32768 --gpu-memory-utilization 0.92
# Droid -> http://localhost:8000/v1
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
Suggested context: ~32768 tokens
Cloud reference: best case: GPT-4o-class on narrower tasks
Frontier leader: Claude Opus 4.6 / GPT-5.4
Links:
- Engine: https://github.com/vllm-project/vllm
- Harness: https://docs.factory.ai/cli/byok/overview
- Model: https://huggingface.co/Qwen/Qwen2.5-Coder-32B-Instruct-AWQ
Commands:
```bash
pip install -U "vllm>=0.15.0"
huggingface-cli download "Qwen/Qwen2.5-Coder-32B-Instruct-AWQ"
vllm serve "Qwen/Qwen2.5-Coder-32B-Instruct-AWQ" --host 0.0.0.0 --port 8000 --max-model-len 32768 --gpu-memory-utilization 0.92
# Droid -> http://localhost:8000/v1
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
Suggested context: ~32768 tokens
Cloud reference: best case: GPT-4o-class on narrower tasks
Frontier leader: GPT-5.4 / Claude Opus 4.6
Links:
- Engine: https://github.com/vllm-project/vllm
- Harness: https://docs.factory.ai/cli/byok/overview
- Model: https://huggingface.co/QuantTrio/Qwen3-VL-30B-A3B-Instruct-AWQ
Commands:
```bash
pip install -U "vllm>=0.15.0"
huggingface-cli download "QuantTrio/Qwen3-VL-30B-A3B-Instruct-AWQ"
vllm serve "QuantTrio/Qwen3-VL-30B-A3B-Instruct-AWQ" --host 0.0.0.0 --port 8000 --max-model-len 32768 --gpu-memory-utilization 0.92
# Droid -> http://localhost:8000/v1
```
Why this pick:
- A single 24GB-class NVIDIA Linux box should use direct vLLM for the best one-model baseline when a strong quantized model fits.
- This model led the live Hugging Face discovery results after scoring hardware fit, use-case alignment, recency, popularity, and runtime compatibility.
- Droid is the default harness unless the user needs a lighter path.
- Picked from a scored Hugging Face shortlist instead of the conservative default.
Comparison note:
- This is a strong open local tier that may feel GPT-4o-class on narrower tasks, but it remains below GPT-5.4 / Claude Opus 4.6 on hard multi-step work.
- Inference from open-model class, size, and fit heuristics rather than direct benchmark equivalence.
