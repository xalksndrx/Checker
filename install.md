## agentic
Engine: vLLM
Harness: Droid
Model: sakamakismile/Huihui-Qwen3.6-27B-abliterated-NVFP4
Format: NVFP4
Focus: uncensored / abliterated / heretic variants
Estimated throughput: ~32 tok/s
Estimated first token: ~0.84 s
Suggested context: ~16384 tokens
Cloud reference: roughly GPT-4-era usefulness on narrower work
Frontier leader: Claude Opus 4.6 / GPT-5.4
Links:
- Engine: https://github.com/vllm-project/vllm
- Harness: https://docs.factory.ai/cli/byok/overview
- Model: https://huggingface.co/sakamakismile/Huihui-Qwen3.6-27B-abliterated-NVFP4
Commands:
```bash
pip install -U "vllm>=0.6.0"
huggingface-cli download "sakamakismile/Huihui-Qwen3.6-27B-abliterated-NVFP4"
python -m vllm.entrypoints.openai.api_server --model "sakamakismile/Huihui-Qwen3.6-27B-abliterated-NVFP4" --host 0.0.0.0 --port 8000
# Droid -> http://localhost:8000/v1
```
Why this pick:
- A single 24GB-class NVIDIA Linux box should start with direct vLLM for a stable benchmark baseline.
- This uncensored shortlist pick stayed ahead after scoring fit, recency, and use-case alignment.
- Droid is the default harness for coding and agentic workflows.
- Picked from a scored Hugging Face shortlist instead of the conservative default; 0xSero gets a preference bonus unless fit or use-case makes it a clear loser.
Comparison note:
- This should be thought of as practical local GPT-4-era usefulness on narrower tasks, not as a peer to Claude Opus 4.6 / GPT-5.4.
- Inference from open-model class, size, and fit heuristics rather than direct benchmark equivalence.
Top choices:
- 1. sakamakismile/Huihui-Qwen3.6-27B-abliterated-NVFP4 (NVFP4, confirmed, score 54.5, fit comfortable, ~32 tok/s, context ~16384)
- 2. ibrahimkettaneh/Qwen2.5-32B-Instruct-abliterated-pass2-AWQ (AWQ 4-bit, confirmed, score 53.3, fit balanced, ~28 tok/s, context ~16384)
- 3. sakamakismile/Huihui-gemma-4-26B-A4B-it-abliterated-NVFP4 (NVFP4, confirmed, score 51.9, fit comfortable, ~46 tok/s, context ~16384)
- 4. AEON-7/Gemma-4-26B-A4B-it-Uncensored-NVFP4 (NVFP4, confirmed, score 51.1, fit comfortable, ~46 tok/s, context ~16384)
- 5. huihui-ai/Qwen2.5-14B-Instruct-abliterated-v2 (native weights, confirmed, score 49.2, fit comfortable, ~51 tok/s, context ~16384)
Tradeoffs:
- sakamakismile/Huihui-Qwen3.6-27B-abliterated-NVFP4: balanced quality tier; midrange decode; good headroom for context; uncensored variant
- ibrahimkettaneh/Qwen2.5-32B-Instruct-abliterated-pass2-AWQ: stronger quality tier; midrange decode; good headroom for context; uncensored variant
- sakamakismile/Huihui-gemma-4-26B-A4B-it-abliterated-NVFP4: MoE-style quality above its active 4B path; midrange decode; good headroom for context; uncensored variant
- AEON-7/Gemma-4-26B-A4B-it-Uncensored-NVFP4: MoE-style quality above its active 4B path; midrange decode; good headroom for context; uncensored variant
- huihui-ai/Qwen2.5-14B-Instruct-abliterated-v2: balanced quality tier; fast decode; good headroom for context; uncensored variant
Run labels:
- sakamakismile/Huihui-Qwen3.6-27B-abliterated-NVFP4: confirmed - This candidate fits the selected runtime cleanly and should be a safe default for this hardware class.
- ibrahimkettaneh/Qwen2.5-32B-Instruct-abliterated-pass2-AWQ: confirmed - This candidate fits the selected runtime cleanly and should be a safe default for this hardware class.
- sakamakismile/Huihui-gemma-4-26B-A4B-it-abliterated-NVFP4: confirmed - This candidate fits the selected runtime cleanly and should be a safe default for this hardware class.
- AEON-7/Gemma-4-26B-A4B-it-Uncensored-NVFP4: confirmed - This candidate fits the selected runtime cleanly and should be a safe default for this hardware class.
- huihui-ai/Qwen2.5-14B-Instruct-abliterated-v2: confirmed - This candidate fits the selected runtime cleanly and should be a safe default for this hardware class.

## coding
Engine: vLLM
Harness: Droid
Model: ansulev/OmniCoder-9B-heretic-ara-uncensored
Format: native weights
Focus: uncensored / abliterated / heretic variants
Estimated throughput: ~70 tok/s
Estimated first token: ~0.15 s
Suggested context: ~16384 tokens
Cloud reference: below GPT-4-class
Frontier leader: Claude Opus 4.6 / GPT-5.4
Links:
- Engine: https://github.com/vllm-project/vllm
- Harness: https://docs.factory.ai/cli/byok/overview
- Model: https://huggingface.co/ansulev/OmniCoder-9B-heretic-ara-uncensored
Commands:
```bash
pip install -U "vllm>=0.6.0"
huggingface-cli download "ansulev/OmniCoder-9B-heretic-ara-uncensored"
python -m vllm.entrypoints.openai.api_server --model "ansulev/OmniCoder-9B-heretic-ara-uncensored" --host 0.0.0.0 --port 8000
# Droid -> http://localhost:8000/v1
```
Why this pick:
- A single 24GB-class NVIDIA Linux box should start with direct vLLM for a stable benchmark baseline.
- This uncensored shortlist pick stayed ahead after scoring fit, recency, and use-case alignment.
- Droid is the default harness for coding and agentic workflows.
- Picked from a scored Hugging Face shortlist instead of the conservative default; 0xSero gets a preference bonus unless fit or use-case makes it a clear loser.
Comparison note:
- This local pick is well below Claude Opus 4.6 / GPT-5.4 and should not be treated as frontier-cloud-equivalent.
- Inference from open-model class, size, and fit heuristics rather than direct benchmark equivalence.
Top choices:
- 1. ansulev/OmniCoder-9B-heretic-ara-uncensored (native weights, confirmed, score 49, fit comfortable, ~70 tok/s, context ~16384)
- 2. Siavashst77/qwen3-coder-merge (native weights, confirmed, score 49, fit comfortable, ~70 tok/s, context ~16384)
- 3. ibrahimkettaneh/Qwen2.5-32B-Instruct-abliterated-pass2-AWQ (AWQ 4-bit, confirmed, score 48.3, fit balanced, ~28 tok/s, context ~16384)
- 4. sakamakismile/Huihui-Qwen3.6-27B-abliterated-NVFP4 (NVFP4, confirmed, score 46.5, fit comfortable, ~32 tok/s, context ~16384)
- 5. huihui-ai/Qwen2.5-14B-Instruct-abliterated-v2 (native weights, confirmed, score 44.2, fit comfortable, ~51 tok/s, context ~16384)
Tradeoffs:
- ansulev/OmniCoder-9B-heretic-ara-uncensored: faster but lighter model class; fast decode; good headroom for context; uncensored variant
- Siavashst77/qwen3-coder-merge: faster but lighter model class; fast decode; good headroom for context; uncensored variant
- ibrahimkettaneh/Qwen2.5-32B-Instruct-abliterated-pass2-AWQ: stronger quality tier; midrange decode; good headroom for context; uncensored variant
- sakamakismile/Huihui-Qwen3.6-27B-abliterated-NVFP4: balanced quality tier; midrange decode; good headroom for context; uncensored variant
- huihui-ai/Qwen2.5-14B-Instruct-abliterated-v2: balanced quality tier; fast decode; good headroom for context; uncensored variant
Run labels:
- ansulev/OmniCoder-9B-heretic-ara-uncensored: confirmed - This candidate fits the selected runtime cleanly and should be a safe default for this hardware class.
- Siavashst77/qwen3-coder-merge: confirmed - This candidate fits the selected runtime cleanly and should be a safe default for this hardware class.
- ibrahimkettaneh/Qwen2.5-32B-Instruct-abliterated-pass2-AWQ: confirmed - This candidate fits the selected runtime cleanly and should be a safe default for this hardware class.
- sakamakismile/Huihui-Qwen3.6-27B-abliterated-NVFP4: confirmed - This candidate fits the selected runtime cleanly and should be a safe default for this hardware class.
- huihui-ai/Qwen2.5-14B-Instruct-abliterated-v2: confirmed - This candidate fits the selected runtime cleanly and should be a safe default for this hardware class.

## general
Engine: vLLM
Harness: Droid
Model: sakamakismile/Huihui-Qwen3.6-27B-abliterated-NVFP4
Format: NVFP4
Focus: uncensored / abliterated / heretic variants
Estimated throughput: ~32 tok/s
Estimated first token: ~0.84 s
Suggested context: ~16384 tokens
Cloud reference: roughly GPT-4-era usefulness on narrower work
Frontier leader: GPT-5.4 / Claude Opus 4.6
Links:
- Engine: https://github.com/vllm-project/vllm
- Harness: https://docs.factory.ai/cli/byok/overview
- Model: https://huggingface.co/sakamakismile/Huihui-Qwen3.6-27B-abliterated-NVFP4
Commands:
```bash
pip install -U "vllm>=0.6.0"
huggingface-cli download "sakamakismile/Huihui-Qwen3.6-27B-abliterated-NVFP4"
python -m vllm.entrypoints.openai.api_server --model "sakamakismile/Huihui-Qwen3.6-27B-abliterated-NVFP4" --host 0.0.0.0 --port 8000
# Droid -> http://localhost:8000/v1
```
Why this pick:
- A single 24GB-class NVIDIA Linux box should start with direct vLLM for a stable benchmark baseline.
- This uncensored shortlist pick stayed ahead after scoring fit, recency, and use-case alignment.
- Droid is the default harness unless the user needs a lighter path.
- Picked from a scored Hugging Face shortlist instead of the conservative default; 0xSero gets a preference bonus unless fit or use-case makes it a clear loser.
Comparison note:
- This should be thought of as practical local GPT-4-era usefulness on narrower tasks, not as a peer to GPT-5.4 / Claude Opus 4.6.
- Inference from open-model class, size, and fit heuristics rather than direct benchmark equivalence.
Top choices:
- 1. sakamakismile/Huihui-Qwen3.6-27B-abliterated-NVFP4 (NVFP4, confirmed, score 54.5, fit comfortable, ~32 tok/s, context ~16384)
- 2. ibrahimkettaneh/Qwen2.5-32B-Instruct-abliterated-pass2-AWQ (AWQ 4-bit, confirmed, score 53.3, fit balanced, ~28 tok/s, context ~16384)
- 3. sakamakismile/Huihui-gemma-4-26B-A4B-it-abliterated-NVFP4 (NVFP4, confirmed, score 51.9, fit comfortable, ~46 tok/s, context ~16384)
- 4. AEON-7/Gemma-4-26B-A4B-it-Uncensored-NVFP4 (NVFP4, confirmed, score 51.1, fit comfortable, ~46 tok/s, context ~16384)
- 5. huihui-ai/Qwen2.5-14B-Instruct-abliterated-v2 (native weights, confirmed, score 49.2, fit comfortable, ~51 tok/s, context ~16384)
Tradeoffs:
- sakamakismile/Huihui-Qwen3.6-27B-abliterated-NVFP4: balanced quality tier; midrange decode; good headroom for context; uncensored variant
- ibrahimkettaneh/Qwen2.5-32B-Instruct-abliterated-pass2-AWQ: stronger quality tier; midrange decode; good headroom for context; uncensored variant
- sakamakismile/Huihui-gemma-4-26B-A4B-it-abliterated-NVFP4: MoE-style quality above its active 4B path; midrange decode; good headroom for context; uncensored variant
- AEON-7/Gemma-4-26B-A4B-it-Uncensored-NVFP4: MoE-style quality above its active 4B path; midrange decode; good headroom for context; uncensored variant
- huihui-ai/Qwen2.5-14B-Instruct-abliterated-v2: balanced quality tier; fast decode; good headroom for context; uncensored variant
Run labels:
- sakamakismile/Huihui-Qwen3.6-27B-abliterated-NVFP4: confirmed - This candidate fits the selected runtime cleanly and should be a safe default for this hardware class.
- ibrahimkettaneh/Qwen2.5-32B-Instruct-abliterated-pass2-AWQ: confirmed - This candidate fits the selected runtime cleanly and should be a safe default for this hardware class.
- sakamakismile/Huihui-gemma-4-26B-A4B-it-abliterated-NVFP4: confirmed - This candidate fits the selected runtime cleanly and should be a safe default for this hardware class.
- AEON-7/Gemma-4-26B-A4B-it-Uncensored-NVFP4: confirmed - This candidate fits the selected runtime cleanly and should be a safe default for this hardware class.
- huihui-ai/Qwen2.5-14B-Instruct-abliterated-v2: confirmed - This candidate fits the selected runtime cleanly and should be a safe default for this hardware class.
