## agentic
Engine: llama.cpp
Harness: Pi
Model: Qwen/Qwen3.5-9B-GGUF
Format: GGUF Q4_K_M
Estimated throughput: ~12 tok/s
Estimated first token: ~0.75 s
Suggested context: ~8192 tokens
Cloud reference: below GPT-4-class
Frontier leader: Claude Opus 4.6 / GPT-5.4
Links:
- Engine: https://github.com/ggml-org/llama.cpp
- Harness: https://huggingface.co/docs/inference-providers/en/integrations/pi
- Model: https://huggingface.co/Qwen/Qwen3.5-9B-GGUF
Commands:
```bash
Build or install llama.cpp with server support
huggingface-cli download "Qwen/Qwen3.5-9B-GGUF"
llama-server -m "./models/qwen3-5.gguf" --host 0.0.0.0 --port 8000
# Pi -> http://localhost:8000/v1
```
Why this pick:
- CPU, integrated GPU, and mixed portability cases map to the guide's llama.cpp recommendation.
- 12GB-16GB budgets should stay in the 7B-9B class.
- CPU-only systems benefit from Pi's minimal context bloat and strong token caching.
- Scored against the compatible Hugging Face shortlist and still won on fit, use-case, and source preference.
Comparison note:
- This local pick is well below Claude Opus 4.6 / GPT-5.4 and should not be treated as frontier-cloud-equivalent.
- Inference from open-model class, size, and fit heuristics rather than direct benchmark equivalence.
Top choices:
- 1. Qwen/Qwen3.5-9B-GGUF (GGUF Q4_K_M, confirmed, score 39, fit comfortable, ~12 tok/s, context ~8192)
- 2. Qwen/Qwen3.5-4B-GGUF (GGUF Q4_K_M, confirmed, score 35, fit comfortable, ~23 tok/s, context ~8192)
- 3. Qwen/Qwen3.5-14B-Instruct-GGUF (GGUF Q5_K_M, likely, score 16, fit hybrid offload, ~8 tok/s, context ~8192)
- 4. Qwen/Qwen3-14B-AWQ (AWQ 4-bit, format mismatch, score 11, fit balanced, ~8 tok/s, context ~8192)
Tradeoffs:
- Qwen/Qwen3.5-9B-GGUF: faster but lighter model class; slower decode; good headroom for context
- Qwen/Qwen3.5-4B-GGUF: faster but lighter model class; midrange decode; good headroom for context
- Qwen/Qwen3.5-14B-Instruct-GGUF: balanced quality tier; slower decode; needs host RAM offload and shorter context
- Qwen/Qwen3-14B-AWQ: balanced quality tier; slower decode; good headroom for context
Run labels:
- Qwen/Qwen3.5-9B-GGUF: confirmed - This candidate fits the selected runtime cleanly and should be a safe default for this hardware class.
- Qwen/Qwen3.5-4B-GGUF: confirmed - This candidate fits the selected runtime cleanly and should be a safe default for this hardware class.
- Qwen/Qwen3.5-14B-Instruct-GGUF: likely - This candidate should run, but it likely needs either reduced context or host-memory offload to feel stable.
- Qwen/Qwen3-14B-AWQ: format mismatch - This build is not a GGUF-first llama.cpp target.

## coding
Engine: llama.cpp
Harness: Pi
Model: Qwen/Qwen3.5-9B-GGUF
Format: GGUF Q4_K_M
Estimated throughput: ~12 tok/s
Estimated first token: ~0.75 s
Suggested context: ~8192 tokens
Cloud reference: below GPT-4-class
Frontier leader: Claude Opus 4.6 / GPT-5.4
Links:
- Engine: https://github.com/ggml-org/llama.cpp
- Harness: https://huggingface.co/docs/inference-providers/en/integrations/pi
- Model: https://huggingface.co/Qwen/Qwen3.5-9B-GGUF
Commands:
```bash
Build or install llama.cpp with server support
huggingface-cli download "Qwen/Qwen3.5-9B-GGUF"
llama-server -m "./models/qwen3-5-coder.gguf" --host 0.0.0.0 --port 8000
# Pi -> http://localhost:8000/v1
```
Why this pick:
- CPU, integrated GPU, and mixed portability cases map to the guide's llama.cpp recommendation.
- 12GB-16GB budgets should stay in the 7B-9B class.
- CPU-only systems benefit from Pi's minimal context bloat and strong token caching.
- Scored against the compatible Hugging Face shortlist and still won on fit, use-case, and source preference.
Comparison note:
- This local pick is well below Claude Opus 4.6 / GPT-5.4 and should not be treated as frontier-cloud-equivalent.
- Inference from open-model class, size, and fit heuristics rather than direct benchmark equivalence.
Top choices:
- 1. Qwen/Qwen3.5-9B-GGUF (GGUF Q4_K_M, confirmed, score 43, fit comfortable, ~12 tok/s, context ~8192)
- 2. Qwen/Qwen3.5-4B-GGUF (GGUF Q4_K_M, confirmed, score 39, fit comfortable, ~23 tok/s, context ~8192)
- 3. Qwen/Qwen3-Coder-14B-GGUF (GGUF Q5_K_M, likely, score 20, fit hybrid offload, ~8 tok/s, context ~8192)
- 4. Qwen/Qwen2.5-Coder-14B-Instruct-AWQ (AWQ 4-bit, format mismatch, score 15, fit balanced, ~8 tok/s, context ~8192)
Tradeoffs:
- Qwen/Qwen3.5-9B-GGUF: faster but lighter model class; slower decode; good headroom for context
- Qwen/Qwen3.5-4B-GGUF: faster but lighter model class; midrange decode; good headroom for context
- Qwen/Qwen3-Coder-14B-GGUF: balanced quality tier; slower decode; needs host RAM offload and shorter context
- Qwen/Qwen2.5-Coder-14B-Instruct-AWQ: balanced quality tier; slower decode; good headroom for context
Run labels:
- Qwen/Qwen3.5-9B-GGUF: confirmed - This candidate fits the selected runtime cleanly and should be a safe default for this hardware class.
- Qwen/Qwen3.5-4B-GGUF: confirmed - This candidate fits the selected runtime cleanly and should be a safe default for this hardware class.
- Qwen/Qwen3-Coder-14B-GGUF: likely - This candidate should run, but it likely needs either reduced context or host-memory offload to feel stable.
- Qwen/Qwen2.5-Coder-14B-Instruct-AWQ: format mismatch - This build is not a GGUF-first llama.cpp target.

## general
Engine: llama.cpp
Harness: Pi
Model: Qwen/Qwen3.5-9B-GGUF
Format: GGUF Q4_K_M
Estimated throughput: ~12 tok/s
Estimated first token: ~0.75 s
Suggested context: ~8192 tokens
Cloud reference: below GPT-4-class
Frontier leader: GPT-5.4 / Claude Opus 4.6
Links:
- Engine: https://github.com/ggml-org/llama.cpp
- Harness: https://huggingface.co/docs/inference-providers/en/integrations/pi
- Model: https://huggingface.co/Qwen/Qwen3.5-9B-GGUF
Commands:
```bash
Build or install llama.cpp with server support
huggingface-cli download "Qwen/Qwen3.5-9B-GGUF"
llama-server -m "./models/qwen3-5.gguf" --host 0.0.0.0 --port 8000
# Pi -> http://localhost:8000/v1
```
Why this pick:
- CPU, integrated GPU, and mixed portability cases map to the guide's llama.cpp recommendation.
- 12GB-16GB budgets should stay in the 7B-9B class.
- CPU-only systems benefit from Pi's minimal context bloat and strong token caching.
- Scored against the compatible Hugging Face shortlist and still won on fit, use-case, and source preference.
Comparison note:
- This local pick is well below GPT-5.4 / Claude Opus 4.6 and should not be treated as frontier-cloud-equivalent.
- Inference from open-model class, size, and fit heuristics rather than direct benchmark equivalence.
Top choices:
- 1. Qwen/Qwen3.5-9B-GGUF (GGUF Q4_K_M, confirmed, score 39, fit comfortable, ~12 tok/s, context ~8192)
- 2. Qwen/Qwen3.5-4B-GGUF (GGUF Q4_K_M, confirmed, score 35, fit comfortable, ~23 tok/s, context ~8192)
- 3. Qwen/Qwen3.5-14B-Instruct-GGUF (GGUF Q5_K_M, likely, score 16, fit hybrid offload, ~8 tok/s, context ~8192)
- 4. Qwen/Qwen3-14B-AWQ (AWQ 4-bit, format mismatch, score 11, fit balanced, ~8 tok/s, context ~8192)
Tradeoffs:
- Qwen/Qwen3.5-9B-GGUF: faster but lighter model class; slower decode; good headroom for context
- Qwen/Qwen3.5-4B-GGUF: faster but lighter model class; midrange decode; good headroom for context
- Qwen/Qwen3.5-14B-Instruct-GGUF: balanced quality tier; slower decode; needs host RAM offload and shorter context
- Qwen/Qwen3-14B-AWQ: balanced quality tier; slower decode; good headroom for context
Run labels:
- Qwen/Qwen3.5-9B-GGUF: confirmed - This candidate fits the selected runtime cleanly and should be a safe default for this hardware class.
- Qwen/Qwen3.5-4B-GGUF: confirmed - This candidate fits the selected runtime cleanly and should be a safe default for this hardware class.
- Qwen/Qwen3.5-14B-Instruct-GGUF: likely - This candidate should run, but it likely needs either reduced context or host-memory offload to feel stable.
- Qwen/Qwen3-14B-AWQ: format mismatch - This build is not a GGUF-first llama.cpp target.
