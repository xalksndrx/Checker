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
Top choices:
- 1. cyankiwi/Qwen3.6-27B-AWQ-INT4 (AWQ 4-bit, confirmed, score 47.5, fit comfortable, ~32 tok/s, context ~32768)
- 2. QuantTrio/Qwen3.6-27B-AWQ (AWQ 4-bit, confirmed, score 47.5, fit comfortable, ~32 tok/s, context ~32768)
- 3. Lorbus/Qwen3.6-27B-int4-AutoRound (W4A16 / 4-bit, confirmed, score 47.5, fit comfortable, ~32 tok/s, context ~32768)
- 4. Qwen/Qwen2.5-Coder-32B-Instruct-AWQ (AWQ 4-bit, confirmed, score 47.4, fit balanced, ~28 tok/s, context ~32768)
- 5. cyankiwi/gemma-4-26B-A4B-it-AWQ-4bit (AWQ 4-bit, confirmed, score 47, fit comfortable, ~46 tok/s, context ~32768)
Tradeoffs:
- cyankiwi/Qwen3.6-27B-AWQ-INT4: balanced quality tier; midrange decode; good headroom for context
- QuantTrio/Qwen3.6-27B-AWQ: balanced quality tier; midrange decode; good headroom for context
- Lorbus/Qwen3.6-27B-int4-AutoRound: balanced quality tier; midrange decode; good headroom for context
- Qwen/Qwen2.5-Coder-32B-Instruct-AWQ: stronger quality tier; midrange decode; good headroom for context
- cyankiwi/gemma-4-26B-A4B-it-AWQ-4bit: MoE-style quality above its active 4B path; midrange decode; good headroom for context
Run labels:
- cyankiwi/Qwen3.6-27B-AWQ-INT4: confirmed - This candidate fits the selected runtime cleanly and should be a safe default for this hardware class.
- QuantTrio/Qwen3.6-27B-AWQ: confirmed - This candidate fits the selected runtime cleanly and should be a safe default for this hardware class.
- Lorbus/Qwen3.6-27B-int4-AutoRound: confirmed - This candidate fits the selected runtime cleanly and should be a safe default for this hardware class.
- Qwen/Qwen2.5-Coder-32B-Instruct-AWQ: confirmed - This candidate fits the selected runtime cleanly and should be a safe default for this hardware class.
- cyankiwi/gemma-4-26B-A4B-it-AWQ-4bit: confirmed - This candidate fits the selected runtime cleanly and should be a safe default for this hardware class.
Best uncensored / abliterated / heretic choices:
- 1. zhiqing/Huihui-Qwen3.6-27B-abliterated-AWQ-MTP (AWQ 4-bit, confirmed, score 42.1, fit comfortable, ~32 tok/s, context ~32768)
- 2. ibrahimkettaneh/Qwen2.5-32B-Instruct-abliterated-pass2-AWQ (AWQ 4-bit, confirmed, score 40.6, fit balanced, ~28 tok/s, context ~32768)
- 3. lhca521/Huihui-Qwen3.6-27B-abliterated-AWQ (AWQ 4-bit, confirmed, score 39.1, fit comfortable, ~32 tok/s, context ~32768)
- 4. edp1096/Huihui-Qwen3.6-27B-abliterated-FP8 (FP8, confirmed, score 37.6, fit balanced, ~32 tok/s, context ~32768)
- 5. llmfan46/Qwen3.6-27B-uncensored-heretic-v2-GPTQ-Int4 (GPTQ 4-bit, confirmed, score 36.6, fit comfortable, ~32 tok/s, context ~32768)

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
Top choices:
- 1. Qwen/Qwen2.5-Coder-32B-Instruct-AWQ (AWQ 4-bit, confirmed, score 53.4, fit balanced, ~28 tok/s, context ~32768)
- 2. Qwen/Qwen2.5-Coder-14B-Instruct-AWQ (AWQ 4-bit, confirmed, score 49.4, fit comfortable, ~49 tok/s, context ~32768)
- 3. Tesslate/OmniCoder-9B (native weights, confirmed, score 46.2, fit comfortable, ~70 tok/s, context ~32768)
- 4. Qwen/Qwen2.5-Coder-7B-Instruct (BF16, confirmed, score 45.8, fit comfortable, ~79 tok/s, context ~32768)
- 5. deepseek-ai/DeepSeek-Coder-V2-Lite-Instruct (BF16, confirmed, score 44.9, fit balanced, ~47 tok/s, context ~32768)
Tradeoffs:
- Qwen/Qwen2.5-Coder-32B-Instruct-AWQ: stronger quality tier; midrange decode; good headroom for context
- Qwen/Qwen2.5-Coder-14B-Instruct-AWQ: balanced quality tier; midrange decode; good headroom for context
- Tesslate/OmniCoder-9B: faster but lighter model class; fast decode; good headroom for context
- Qwen/Qwen2.5-Coder-7B-Instruct: faster but lighter model class; fast decode; good headroom for context
- deepseek-ai/DeepSeek-Coder-V2-Lite-Instruct: balanced quality tier; midrange decode; good headroom for context
Run labels:
- Qwen/Qwen2.5-Coder-32B-Instruct-AWQ: confirmed - This candidate fits the selected runtime cleanly and should be a safe default for this hardware class.
- Qwen/Qwen2.5-Coder-14B-Instruct-AWQ: confirmed - This candidate fits the selected runtime cleanly and should be a safe default for this hardware class.
- Tesslate/OmniCoder-9B: confirmed - This candidate fits the selected runtime cleanly and should be a safe default for this hardware class.
- Qwen/Qwen2.5-Coder-7B-Instruct: confirmed - This candidate fits the selected runtime cleanly and should be a safe default for this hardware class.
- deepseek-ai/DeepSeek-Coder-V2-Lite-Instruct: confirmed - This candidate fits the selected runtime cleanly and should be a safe default for this hardware class.
Best uncensored / abliterated / heretic choices:
- 1. sh0ck0r/Huihui-Qwen3-Coder-Next-abliterated-FP8 (FP8, confirmed, score 41.2, fit comfortable, ~70 tok/s, context ~32768)
- 2. ibrahimkettaneh/Qwen2.5-32B-Instruct-abliterated-pass2-AWQ (AWQ 4-bit, confirmed, score 35.6, fit balanced, ~28 tok/s, context ~32768)
- 3. zhiqing/Huihui-Qwen3.6-27B-abliterated-AWQ-MTP (AWQ 4-bit, confirmed, score 34.1, fit comfortable, ~32 tok/s, context ~32768)
- 4. lhca521/Huihui-Qwen3.6-27B-abliterated-AWQ (AWQ 4-bit, confirmed, score 31.1, fit comfortable, ~32 tok/s, context ~32768)
- 5. edp1096/Huihui-Qwen3.6-27B-abliterated-FP8 (FP8, confirmed, score 29.6, fit balanced, ~32 tok/s, context ~32768)

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
Top choices:
- 1. QuantTrio/Qwen3-VL-30B-A3B-Instruct-AWQ (AWQ 4-bit, confirmed, score 49.5, fit balanced, ~51 tok/s, context ~32768)
- 2. cyankiwi/Qwen3.6-27B-AWQ-INT4 (AWQ 4-bit, confirmed, score 47.5, fit comfortable, ~32 tok/s, context ~32768)
- 3. QuantTrio/Qwen3.6-27B-AWQ (AWQ 4-bit, confirmed, score 47.5, fit comfortable, ~32 tok/s, context ~32768)
- 4. Lorbus/Qwen3.6-27B-int4-AutoRound (W4A16 / 4-bit, confirmed, score 47.5, fit comfortable, ~32 tok/s, context ~32768)
- 5. cyankiwi/gemma-4-26B-A4B-it-AWQ-4bit (AWQ 4-bit, confirmed, score 47, fit comfortable, ~46 tok/s, context ~32768)
Tradeoffs:
- QuantTrio/Qwen3-VL-30B-A3B-Instruct-AWQ: MoE-style quality above its active 3B path; fast decode; good headroom for context
- cyankiwi/Qwen3.6-27B-AWQ-INT4: balanced quality tier; midrange decode; good headroom for context
- QuantTrio/Qwen3.6-27B-AWQ: balanced quality tier; midrange decode; good headroom for context
- Lorbus/Qwen3.6-27B-int4-AutoRound: balanced quality tier; midrange decode; good headroom for context
- cyankiwi/gemma-4-26B-A4B-it-AWQ-4bit: MoE-style quality above its active 4B path; midrange decode; good headroom for context
Run labels:
- QuantTrio/Qwen3-VL-30B-A3B-Instruct-AWQ: confirmed - This candidate fits the selected runtime cleanly and should be a safe default for this hardware class.
- cyankiwi/Qwen3.6-27B-AWQ-INT4: confirmed - This candidate fits the selected runtime cleanly and should be a safe default for this hardware class.
- QuantTrio/Qwen3.6-27B-AWQ: confirmed - This candidate fits the selected runtime cleanly and should be a safe default for this hardware class.
- Lorbus/Qwen3.6-27B-int4-AutoRound: confirmed - This candidate fits the selected runtime cleanly and should be a safe default for this hardware class.
- cyankiwi/gemma-4-26B-A4B-it-AWQ-4bit: confirmed - This candidate fits the selected runtime cleanly and should be a safe default for this hardware class.
Best uncensored / abliterated / heretic choices:
- 1. zhiqing/Huihui-Qwen3.6-27B-abliterated-AWQ-MTP (AWQ 4-bit, confirmed, score 42.1, fit comfortable, ~32 tok/s, context ~32768)
- 2. ibrahimkettaneh/Qwen2.5-32B-Instruct-abliterated-pass2-AWQ (AWQ 4-bit, confirmed, score 40.6, fit balanced, ~28 tok/s, context ~32768)
- 3. lhca521/Huihui-Qwen3.6-27B-abliterated-AWQ (AWQ 4-bit, confirmed, score 39.1, fit comfortable, ~32 tok/s, context ~32768)
- 4. huihui-ai/Llama-3.2-11B-Vision-Instruct-abliterated (native weights, confirmed, score 37.6, fit comfortable, ~61 tok/s, context ~32768)
- 5. edp1096/Huihui-Qwen3.6-27B-abliterated-FP8 (FP8, confirmed, score 37.6, fit balanced, ~32 tok/s, context ~32768)
