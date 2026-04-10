# Local LLM Inference Optimizer Guide (v2026.04)

This guide is a practical decision engine for choosing a local inference stack from hardware specs.

It is intentionally biased toward:

- stable, direct runtimes
- repeatable benchmarking
- realistic context sizing
- conservative first picks on 24 GB VRAM systems

The goal is not to chase the most aggressive possible setup on day one. The goal is to get a clean, useful local server working first, then expand deliberately.

This guide should help an agent or human choose:

- the backend/runtime
- the harness or client
- the model family and format
- the first benchmarking path

## 1. Hardware Profiling

Ask for or infer:

- GPU count and model
- total VRAM
- system RAM
- CPU cores / threads
- OS
- SSD availability
- target use case: chat, coding, agentic, research, throughput, or latency

Interpretation rules:

- system RAM matters for downloads, staging, CPU-first inference, and comfort
- VRAM is still the main constraint on dedicated-GPU systems
- do not confuse large system RAM with large effective inference memory on a 24 GB GPU
- long context is limited by KV cache pressure, not just whether weights fit

Practical VRAM rules of thumb:

- under 16 GB VRAM: stay in smaller models or use heavier offload
- 24 GB VRAM: treat 7B to 14B dense models as the safe baseline
- 24 GB VRAM: larger quantized or pruned MoE models are experiments, not the default baseline
- 48 GB+ effective GPU memory on Linux: opens the door to larger vLLM serving targets
- Apple Silicon: treat unified memory differently and prefer MLX first

## 2. Backend Selection

Pick one runtime first. Do not introduce a control-plane layer unless there is a concrete reason.

### Backend summaries

`vLLM`

- best for: stable serving, OpenAI-compatible APIs, repeatable benchmarking, Linux NVIDIA systems
- strongest fit: NVIDIA on Linux, especially when you want one clean server and benchmark target
- strengths: scheduler behavior, KV-cache handling, production-style serving, direct API exposure
- weakness: not always the absolute fastest single-GPU path for every quant format

`llama.cpp`

- best for: maximum portability, CPU-first setups, Mac, mixed hardware, GGUF workflows
- strongest fit: CPU-only, Apple Silicon fallback paths, AMD or lower-VRAM systems, direct local testing
- strengths: broad compatibility, simple deployment, GGUF support, portable local server mode
- weakness: less ideal as the primary standardized runtime for CUDA-first benchmarking on a 4090-class box

`exllamav3`

- best for: deliberate single-GPU speed experiments on NVIDIA
- strongest fit: one strong NVIDIA GPU where maximum tokens/sec is the main goal
- strengths: very fast on supported EXL-class quants
- weakness: should not be the default first runtime if the goal is stable apples-to-apples benchmarking

`SGLang`

- best for: structured output or specific long-context serving experiments
- strongest fit: users who already know why they need it
- note: evaluate later, not as the automatic default

`MLX`

- best for: Apple Silicon
- strongest fit: native Mac workflows

### Agent rules for backend choice

- Linux + NVIDIA + multi-GPU or very large effective GPU memory: prefer `vLLM`
- Linux + single 24 GB NVIDIA box: prefer `vLLM` first if the goal is a stable local server and benchmark baseline
- Linux + single NVIDIA box + explicit speed-first priority: `exllamav3` can be a later comparison target
- Mac / Apple Silicon: prefer `MLX`, then `llama.cpp` if needed
- CPU-heavy, mixed, portable, or low-VRAM systems: prefer `llama.cpp`
- Do not recommend an orchestration/control UI by default

### Important operating principle

On a 4090-class machine, do not switch engines casually during initial evaluation.

Standardize on one runtime first:

1. get the runtime stable
2. validate one strong baseline model
3. benchmark through a single API shape
4. only compare other engines later if there is a specific problem to solve

## 3. Model Format Guidance

Format choice should follow runtime stability, not novelty.

Priority by situation:

- `vLLM`: prefer formats it supports cleanly and predictably
- `llama.cpp`: prefer GGUF
- `exllamav3`: prefer EXL-class quants only when you intentionally choose that engine

### REAP and pruned MoE models

REAP-style and other pruned MoE releases can be excellent when they are well built and fit the hardware target.

Use them with discipline:

- treat them as deliberate model candidates, not as the automatic answer
- log the exact quant/pruning format in every benchmark
- do not compare a weak quant against a stronger quant and call it a model comparison

### Conservative model sizing rules

- 24 GB single GPU baseline: 7B to 14B dense models
- 24 GB single GPU experiments: larger quantized or pruned MoE models, with conservative context
- lower-memory or CPU-first systems: smaller GGUF models
- BF16 / FP16: only when hardware actually supports it comfortably

Do not pick a model just because it is new or huge. Prefer models that matter for:

- code generation
- tool use
- instruction following
- summarization
- factual writing

## 4. Context and KV Cache Rules

Do not chase maximum context early.

Use a realistic baseline context first, then test larger contexts separately.

Why:

- KV cache grows fast
- long context can destroy latency before a hard failure happens
- a model that technically loads may still be a bad serving choice at high context

Rules:

- on 24 GB VRAM, be conservative with large advertised context windows
- keep context fixed when comparing models
- expand context only after the baseline run is stable
- log context length every time

## 5. Harnesses and Clients

Harnesses are secondary. They should connect to a clean local endpoint and stay out of the way.

Options:

- `Droid`: strong default for agentic workflows if you already want it
- `Pi`: lighter and more minimal
- `OpenCode`: straightforward onboarding
- `Zed` with a local provider: strong coding-focused workflow

Agent rules:

- choose the harness separately from the backend
- do not let the harness choice dictate the inference engine
- default to the simplest path that can talk to `http://localhost:8000/v1`

## 6. Benchmarking Rules

The benchmark harness should stay engine-agnostic when possible, but the implementation target should remain one runtime at a time.

Always log:

- runtime / backend
- exact model name
- exact quant or format
- context length
- sampling settings
- hardware assumptions

Benchmarking rules:

- preserve raw outputs before cleanup
- keep prompts fixed
- keep sampling fixed
- compare like with like
- do not switch runtime, format, prompt, and sampling all at once

Serving priorities:

1. stable startup
2. correct model loading
3. usable context length
4. repeatable benchmark behavior
5. tokens per second
6. concurrency

## 7. Full Decision Process

Step-by-step:

1. profile the hardware
2. choose one backend directly
3. choose one baseline model that fits the runtime and hardware conservatively
4. expose a local OpenAI-compatible endpoint if the runtime supports it
5. validate local calls
6. run the benchmark suite under fixed settings
7. only after that, compare other models, formats, or engines

Selection logic:

- if Linux + NVIDIA + stable serving priority: choose `vLLM`
- if CPU / mixed portability / GGUF-first: choose `llama.cpp`
- if Apple Silicon: choose `MLX`
- if explicit single-GPU speed experiment: choose `exllamav3`

Model logic:

- check whether a reliable format exists for the chosen runtime
- prefer a conservative baseline first
- only escalate to larger REAP or MoE variants after the benchmark flow is stable

## 8. Example Outputs

### Example: 1x RTX 4090, 24 GB VRAM, 128 GB RAM, Linux

- backend: `vLLM`
- harness: any client that can hit `http://localhost:8000/v1`
- baseline model lane: 7B to 14B dense
- larger model lane: later experiments only
- benchmark posture: fixed context, fixed sampling, one request at a time

Reasoning:

- 24 GB VRAM is the main constraint
- 128 GB RAM improves system comfort but does not remove the VRAM bottleneck
- the first priority should be a stable direct `vLLM` server, not a speed-maximized single-GPU stack

### Example: CPU-only or portability-first machine

- backend: `llama.cpp`
- model lane: GGUF quantized models sized conservatively to RAM
- harness: any local client that supports an OpenAI-compatible endpoint

### Example: Apple Silicon machine

- backend: `MLX`
- fallback: `llama.cpp`
- model lane: sized to unified memory with context headroom

## 9. Resources

- 0xSero Hugging Face: https://huggingface.co/0xSero
- vLLM: https://github.com/vllm-project/vllm
- llama.cpp: https://github.com/ggml-org/llama.cpp
- SGLang: https://github.com/sgl-project/sglang
- MLX: https://github.com/ml-explore/mlx

Update note:

This guide should be updated when model support, runtime support, or real benchmark evidence changes. New model drops are useful, but they should not override the operating principles above without a concrete reason.

## 10. Machine-Readable Policy

The tool reads the JSON block below at runtime. Update this block when you want recommendation behavior to change.

```json
{
  "version": "v2026.04",
  "engines": {
    "vllm": {
      "key": "vllm",
      "label": "vLLM",
      "controlPlane": "Direct runtime",
      "apiShape": "OpenAI-compatible server on :8000",
      "link": "https://github.com/vllm-project/vllm",
      "commands": {
        "install": "pip install -U \"vllm>=0.6.0\"",
        "fetch": "huggingface-cli download \"{{model}}\"",
        "serve": "python -m vllm.entrypoints.openai.api_server --model \"{{model}}\" --host 0.0.0.0 --port 8000"
      }
    },
    "llama.cpp": {
      "key": "llama.cpp",
      "label": "llama.cpp",
      "controlPlane": "Direct runtime",
      "apiShape": "OpenAI-compatible llama-server endpoint",
      "link": "https://github.com/ggml-org/llama.cpp",
      "commands": {
        "install": "Build or install llama.cpp with server support",
        "fetch": "huggingface-cli download \"{{model}}\"",
        "serve": "llama-server -m \"./models/{{modelFile}}.gguf\" --host 0.0.0.0 --port 8000"
      }
    },
    "mlx": {
      "key": "mlx",
      "label": "MLX-LM",
      "controlPlane": "Direct runtime",
      "apiShape": "MLX local generation or OpenAI-compatible bridge",
      "link": "https://github.com/ml-explore/mlx-lm",
      "commands": {
        "install": "pip install -U mlx-lm",
        "fetch": "python -m mlx_lm.convert --hf-path \"{{model}}\" --mlx-path ./models/{{familySlug}}",
        "serve": "python -m mlx_lm.generate --model \"{{model}}\" --prompt \"Hello\""
      }
    },
    "exllamav3": {
      "key": "exllamav3",
      "label": "exllamav3",
      "controlPlane": "Direct runtime",
      "apiShape": "GPU-first local inference stack",
      "link": "https://github.com/turboderp-org/exllamav2",
      "commands": {
        "install": "Install exllamav3 in a dedicated environment",
        "fetch": "huggingface-cli download \"{{model}}\"",
        "serve": "Run your preferred exllamav3 OpenAI-compatible server wrapper on port 8000"
      }
    }
  },
  "harnesses": {
    "Droid": {
      "name": "Droid",
      "link": "https://docs.factory.ai/cli/byok/overview"
    },
    "Pi": {
      "name": "Pi",
      "link": "https://huggingface.co/docs/inference-providers/en/integrations/pi"
    },
    "OpenCode": {
      "name": "OpenCode",
      "link": "https://opencode.ai/"
    }
  },
  "rules": {
    "engine": [
      {
        "when": { "isPhone": true },
        "value": "llama.cpp",
        "reason": "Phone and Termux-class hardware needs the most portable GGUF runtime with CPU/shared-memory tolerance."
      },
      {
        "when": { "isApple": true },
        "value": "mlx",
        "reason": "Apple Silicon should prefer MLX first, with llama.cpp as the fallback path."
      },
      {
        "when": { "isLinux": true, "isNvidia": true, "any": [ { "dedicatedGpuCount": { "gt": 1 } }, { "effectiveMemory": { "gte": 48 } } ] },
        "value": "vllm",
        "reason": "Linux plus multi-GPU or very large effective GPU memory should standardize on vLLM."
      },
      {
        "when": { "isLinux": true, "isNvidia": true, "vram": { "gte": 20 } },
        "value": "vllm",
        "reason": "A single 24GB-class NVIDIA Linux box should start with direct vLLM for a stable benchmark baseline."
      },
      {
        "when": { "isAMD": true, "hasDedicatedGpu": true },
        "value": "llama.cpp",
        "reason": "AMD is best handled by the broad-compatibility path unless there is a specific ROCm serving reason."
      },
      {
        "when": {},
        "value": "llama.cpp",
        "reason": "CPU, integrated GPU, and mixed portability cases map to the guide's llama.cpp recommendation."
      }
    ],
    "harness": [
      {
        "when": { "isPhone": true },
        "value": "OpenCode",
        "reason": "Phone workflows benefit from the lightest onboarding path and straightforward local endpoint support."
      },
      {
        "when": { "cpuOnly": true },
        "value": "Pi",
        "reason": "CPU-only systems benefit from Pi's minimal context bloat and strong token caching."
      },
      {
        "when": { "hasDedicatedGpu": false, "totalRam": { "lte": 16 } },
        "value": "Pi",
        "reason": "Lower-memory systems benefit from Pi's minimal context bloat and strong token caching."
      },
      {
        "when": { "useCase": ["agentic", "coding", "reasoning"] },
        "value": "Droid",
        "reason": "Droid is the default harness for coding and agentic workflows."
      },
      {
        "when": {},
        "value": "Droid",
        "reason": "Droid is the default harness unless the user needs a lighter path."
      }
    ],
    "model": [
      {
        "when": { "isPhone": true, "totalRam": { "gte": 12 } },
        "value": {
          "default": {
            "name": "Qwen/Qwen3.5-9B",
            "format": "GGUF Q4_K_M",
            "family": "Qwen3.5",
            "source": "Hugging Face GGUF build",
            "reason": "Phone-class memory budgets should stay in a small GGUF target."
          },
          "coding": {
            "name": "Qwen/Qwen3.5-9B",
            "format": "GGUF Q4_K_M",
            "family": "Qwen3.5-Coder",
            "source": "Hugging Face GGUF build",
            "reason": "Phone-class memory budgets should stay in a small GGUF target."
          }
        }
      },
      {
        "when": { "isPhone": true },
        "value": {
          "default": {
            "name": "Qwen/Qwen3.5-4B",
            "format": "GGUF Q4_K_M",
            "family": "Qwen3.5",
            "source": "Hugging Face GGUF build",
            "reason": "Phone-class memory budgets should stay in a very small GGUF target."
          },
          "coding": {
            "name": "Qwen/Qwen3.5-4B",
            "format": "GGUF Q4_K_M",
            "family": "Qwen3.5-Coder",
            "source": "Hugging Face GGUF build",
            "reason": "Phone-class memory budgets should stay in a very small GGUF target."
          }
        }
      },
      {
        "when": { "engine": "vllm", "isNvidia": true, "vram": { "gte": 20 }, "useCase": ["agentic", "general"] },
        "value": {
          "default": {
            "name": "Qwen/Qwen3.5-14B-Instruct",
            "format": "AWQ 4-bit or native vLLM-supported quant",
            "family": "Qwen3.5",
            "source": "Hugging Face",
            "reason": "A 24GB NVIDIA baseline should start in the 14B class before testing larger MoE variants."
          }
        }
      },
      {
        "when": { "engine": "vllm", "isNvidia": true, "vram": { "gte": 20 }, "useCase": "coding" },
        "value": {
          "default": {
            "name": "Qwen/Qwen3-Coder-14B",
            "format": "AWQ 4-bit or native vLLM-supported quant",
            "family": "Qwen3-Coder",
            "source": "Hugging Face",
            "reason": "A 24GB NVIDIA coding baseline should start with a conservative 14B-class model."
          }
        }
      },
      {
        "when": { "engine": "vllm", "effectiveMemory": { "gte": 48 }, "useCase": ["agentic", "general"] },
        "value": {
          "default": {
            "name": "0xSero/Kimi-K2.5-PRISM-REAP-72",
            "format": "REAP + AutoRound W4A16",
            "family": "Kimi-K2.5",
            "source": "0xSero on Hugging Face",
            "reason": "Large Linux GPU boxes can step into heavier REAP and MoE deployments."
          }
        }
      },
      {
        "when": { "engine": "vllm", "effectiveMemory": { "gte": 48 }, "useCase": "coding" },
        "value": {
          "default": {
            "name": "0xSero/qwen3-coder-next-64b-REAP",
            "format": "REAP",
            "family": "Qwen3-Coder-Next",
            "source": "0xSero on Hugging Face",
            "reason": "Large Linux GPU boxes can step into heavier coder-focused REAP deployments."
          }
        }
      },
      {
        "when": { "engine": "mlx", "totalRam": { "gte": 48 } },
        "value": {
          "default": {
            "name": "Qwen/Qwen3.5-32B",
            "format": "MLX 4-bit",
            "family": "Qwen3.5",
            "source": "Hugging Face MLX conversion",
            "reason": "48GB-class Apple Silicon can carry a 32B-range MLX model comfortably."
          },
          "coding": {
            "name": "Qwen/Qwen3-Coder-Next",
            "format": "MLX 4-bit",
            "family": "Qwen3-Coder-Next",
            "source": "Hugging Face MLX conversion",
            "reason": "48GB-class Apple Silicon can carry a larger coding model with reasonable headroom."
          }
        }
      },
      {
        "when": { "engine": "mlx", "totalRam": { "gte": 24 } },
        "value": {
          "default": {
            "name": "Qwen/Qwen3.5-14B",
            "format": "MLX 4-bit",
            "family": "Qwen3.5",
            "source": "Hugging Face MLX conversion",
            "reason": "24GB Apple Silicon fits a mid-tier native MLX path."
          },
          "coding": {
            "name": "Qwen/Qwen3-Coder-Next",
            "format": "MLX 4-bit",
            "family": "Qwen3-Coder-Next",
            "source": "Hugging Face MLX conversion",
            "reason": "24GB Apple Silicon can handle a mid-tier coding model via MLX."
          }
        }
      },
      {
        "when": { "engine": "mlx" },
        "value": {
          "default": {
            "name": "Qwen/Qwen3.5-9B",
            "format": "MLX 4-bit",
            "family": "Qwen3.5",
            "source": "Hugging Face MLX conversion",
            "reason": "16GB-class Apple Silicon should stay in the 7B-9B range."
          },
          "coding": {
            "name": "Qwen/Qwen3.5-9B",
            "format": "MLX 4-bit",
            "family": "Qwen3.5-Coder",
            "source": "Hugging Face MLX conversion",
            "reason": "16GB-class Apple Silicon should stay in the 7B-9B range."
          }
        }
      },
      {
        "when": { "engine": "exllamav3", "hasDedicatedGpu": true, "vram": { "gte": 12 } },
        "value": {
          "default": {
            "name": "Qwen/Qwen3.5-14B",
            "format": "EXL2 4.0bpw",
            "family": "Qwen3.5",
            "source": "Hugging Face EXL2 build",
            "reason": "Single-GPU speed-focused systems should use EXL-class quants when that engine is chosen deliberately."
          },
          "coding": {
            "name": "Qwen/Qwen3-Coder-Next",
            "format": "EXL2 4.0bpw",
            "family": "Qwen3-Coder-Next",
            "source": "Hugging Face EXL2 build",
            "reason": "Single-GPU speed-focused systems should use EXL-class quants when that engine is chosen deliberately."
          }
        }
      },
      {
        "when": { "engine": "llama.cpp", "totalRam": { "gte": 24 } },
        "value": {
          "default": {
            "name": "Qwen/Qwen3.5-14B-Instruct-GGUF",
            "format": "GGUF Q5_K_M",
            "family": "Qwen3.5",
            "source": "Hugging Face GGUF build",
            "reason": "24GB system RAM is a solid llama.cpp target for 12B-14B quantized models."
          },
          "coding": {
            "name": "Qwen/Qwen3-Coder-14B-GGUF",
            "format": "GGUF Q5_K_M",
            "family": "Qwen3-Coder",
            "source": "Hugging Face GGUF build",
            "reason": "24GB system RAM is a solid llama.cpp target for 12B-14B quantized coding models."
          }
        }
      },
      {
        "when": { "engine": "llama.cpp", "totalRam": { "gte": 12 } },
        "value": {
          "default": {
            "name": "Qwen/Qwen3.5-9B-GGUF",
            "format": "GGUF Q4_K_M",
            "family": "Qwen3.5",
            "source": "Hugging Face GGUF build",
            "reason": "12GB-16GB budgets should stay in the 7B-9B class."
          },
          "coding": {
            "name": "Qwen/Qwen3.5-9B-GGUF",
            "format": "GGUF Q4_K_M",
            "family": "Qwen3.5-Coder",
            "source": "Hugging Face GGUF build",
            "reason": "12GB-16GB budgets should stay in the 7B-9B class."
          }
        }
      },
      {
        "when": { "engine": "llama.cpp" },
        "value": {
          "default": {
            "name": "Qwen/Qwen3.5-4B-GGUF",
            "format": "GGUF Q4_K_M",
            "family": "Qwen3.5",
            "source": "Hugging Face GGUF build",
            "reason": "Sub-12GB systems should stick to a 3B-4B local target."
          },
          "coding": {
            "name": "Qwen/Qwen3.5-4B-GGUF",
            "format": "GGUF Q4_K_M",
            "family": "Qwen3.5-Coder",
            "source": "Hugging Face GGUF build",
            "reason": "Sub-12GB systems should stick to a 3B-4B local target."
          }
        }
      }
    ],
    "context": [
      {
        "when": { "engine": "vllm", "effectiveMemory": { "gte": 48 } },
        "value": 32768
      },
      {
        "when": { "engine": "vllm", "vram": { "gte": 20 } },
        "value": 16384
      },
      {
        "when": { "engine": "mlx", "totalRam": { "gte": 24 } },
        "value": 32768
      },
      {
        "when": { "engine": "llama.cpp", "isPhone": true },
        "value": 8192
      },
      {
        "when": { "effectiveMemory": { "gte": 16 } },
        "value": 16384
      },
      {
        "when": {},
        "value": 8192
      }
    ],
    "alternatives": [
      {
        "when": { "engine": "vllm", "vram": { "gte": 20 }, "useCase": "coding" },
        "value": [
          { "name": "Qwen/Qwen3.5-7B-Instruct", "format": "AWQ 4-bit", "source": "Hugging Face" },
          { "name": "Qwen/Qwen3-Coder-7B", "format": "AWQ 4-bit", "source": "Hugging Face" }
        ]
      },
      {
        "when": { "engine": "vllm", "vram": { "gte": 20 } },
        "value": [
          { "name": "Qwen/Qwen3.5-7B-Instruct", "format": "AWQ 4-bit", "source": "Hugging Face" },
          { "name": "0xSero/Qwen-3.5-28B-A3B-REAP", "format": "REAP 4-bit", "source": "0xSero on Hugging Face" }
        ]
      },
      {
        "when": { "engine": "llama.cpp", "totalRam": { "gte": 24 } },
        "value": [
          { "name": "Qwen/Qwen3.5-9B-GGUF", "format": "GGUF Q4_K_M", "source": "Hugging Face" },
          { "name": "Qwen/Qwen3.5-7B-Instruct-GGUF", "format": "GGUF Q5_K_M", "source": "Hugging Face" }
        ]
      },
      {
        "when": { "engine": "mlx" },
        "value": [
          { "name": "Qwen/Qwen3.5-9B", "format": "MLX 4-bit", "source": "Hugging Face" },
          { "name": "Qwen/Qwen3.5-14B", "format": "MLX 4-bit", "source": "Hugging Face" }
        ]
      },
      {
        "when": {},
        "value": [
          { "name": "Qwen/Qwen3.5-4B-GGUF", "format": "GGUF Q4_K_M", "source": "Hugging Face" },
          { "name": "Qwen/Qwen3.5-9B-GGUF", "format": "GGUF Q4_K_M", "source": "Hugging Face" }
        ]
      }
    ],
    "notes": [
      {
        "when": { "isWindows": true, "engine": ["vllm", "exllamav3"] },
        "value": "Windows works, but Linux or WSL2 is still the cleaner NVIDIA runtime path."
      },
      {
        "when": { "engine": "vllm", "effectiveMemory": { "gte": 48 } },
        "value": "Use tensor parallel for multi-GPU or larger-memory vLLM serving."
      },
      {
        "when": { "engine": "vllm", "vram": { "gte": 20 } },
        "value": "Start with a conservative context and fixed sampling before testing larger models or longer windows."
      },
      {
        "when": { "engine": "llama.cpp" },
        "value": "Keep context conservative on shared-memory or CPU-first devices."
      },
      {
        "when": { "engine": "mlx" },
        "value": "Leave headroom in unified memory for the OS and tools."
      }
    ]
  }
}
```
