## agentic
Engine: vLLM
Harness: Droid
Model: Qwen/Qwen3.5-14B-Instruct
Format: AWQ 4-bit or native vLLM-supported quant
Estimated throughput: ~51 tok/s
Estimated first token: ~0.27 s
Suggested context: ~16384 tokens
Links:
- Engine: https://github.com/vllm-project/vllm
- Harness: https://docs.factory.ai/cli/byok/overview
- Model: https://huggingface.co/Qwen/Qwen3.5-14B-Instruct
Commands:
```bash
pip install -U "vllm>=0.6.0"
huggingface-cli download "Qwen/Qwen3.5-14B-Instruct"
python -m vllm.entrypoints.openai.api_server --model "Qwen/Qwen3.5-14B-Instruct" --host 0.0.0.0 --port 8000
# Droid -> http://localhost:8000/v1
```
Alternatives:
- Qwen/Qwen3.5-7B-Instruct (AWQ 4-bit, Hugging Face)
- 0xSero/Qwen-3.5-28B-A3B-REAP (REAP 4-bit, 0xSero on Hugging Face)

## coding
Engine: vLLM
Harness: Droid
Model: Qwen/Qwen3-Coder-14B
Format: AWQ 4-bit or native vLLM-supported quant
Estimated throughput: ~51 tok/s
Estimated first token: ~0.27 s
Suggested context: ~16384 tokens
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
Alternatives:
- Qwen/Qwen3.5-7B-Instruct (AWQ 4-bit, Hugging Face)
- Qwen/Qwen3-Coder-7B (AWQ 4-bit, Hugging Face)

## general
Engine: vLLM
Harness: Droid
Model: Qwen/Qwen3.5-14B-Instruct
Format: AWQ 4-bit or native vLLM-supported quant
Estimated throughput: ~51 tok/s
Estimated first token: ~0.27 s
Suggested context: ~16384 tokens
Links:
- Engine: https://github.com/vllm-project/vllm
- Harness: https://docs.factory.ai/cli/byok/overview
- Model: https://huggingface.co/Qwen/Qwen3.5-14B-Instruct
Commands:
```bash
pip install -U "vllm>=0.6.0"
huggingface-cli download "Qwen/Qwen3.5-14B-Instruct"
python -m vllm.entrypoints.openai.api_server --model "Qwen/Qwen3.5-14B-Instruct" --host 0.0.0.0 --port 8000
# Droid -> http://localhost:8000/v1
```
Alternatives:
- Qwen/Qwen3.5-7B-Instruct (AWQ 4-bit, Hugging Face)
- 0xSero/Qwen-3.5-28B-A3B-REAP (REAP 4-bit, 0xSero on Hugging Face)
