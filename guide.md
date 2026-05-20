# Local LLM Inference Optimizer Guide (v2026.04)

This guide is a practical decision engine for choosing a local inference stack from hardware specs.

It is intentionally biased toward:

- stable, direct runtimes
- repeatable benchmarking
- realistic context sizing
- discovery-first, quality-first picks on 24 GB VRAM systems
- explicit separation between the best one-model default and secondary runtime experiments

The goal is not to chase the most aggressive possible setup on day one. The goal is to get a clean, useful local server working first, then expand deliberately.

This guide should help an agent, human, or hosted UI choose:

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
- on a dedicated NVIDIA box, large system RAM should improve staging and optional offload experiments, but it should not upgrade the baseline model lane beyond what fits in VRAM
- long context is limited by KV cache pressure, not just whether weights fit

Practical VRAM rules of thumb:

- under 16 GB VRAM: stay in smaller models or use heavier offload
- 24 GB VRAM: prefer the best discovered all-purpose quantized model that fits before narrower coder-specialists
- 24 GB VRAM plus 96GB+ system RAM: larger GGUF MoE models become viable experiments through host-RAM offload, not the default one-model answer
- 24 GB VRAM: the first recommended model should fit without CPU weight offload or other rescue-path tricks
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
- Linux + single 24 GB NVIDIA box: prefer `vLLM` first for the best one-model setup when a strong vLLM-compatible quant fits
- Linux + single 24 GB NVIDIA box + 96GB+ RAM: compare a `llama.cpp` GGUF offload lane only after the best vLLM-compatible one-model baseline is measured
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

- 24 GB single GPU baseline: the highest-scoring discovered all-purpose quantized model that fits
- 24 GB single GPU experiments: discovered coder-specialist, GGUF/offload, and alternate quantization candidates with conservative context
- do not treat a pruned REAP release as a 4-bit quant unless the model card explicitly says a real low-bit quant such as `W4A16`, `AWQ`, or `4-bit`
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
- if Linux + NVIDIA + 24 GB VRAM + best one-model quality priority: choose the strongest vLLM-compatible quantized model that fits
- if Linux + NVIDIA + 24 GB VRAM + 96GB+ RAM: test `llama.cpp` GGUF offload only as a secondary comparison lane
- if CPU / mixed portability / GGUF-first: choose `llama.cpp`
- if Apple Silicon: choose `MLX`
- if explicit single-GPU speed experiment: choose `exllamav3`

Model logic:

- check whether a reliable format exists for the chosen runtime
- prefer a conservative baseline first
- only escalate to larger REAP or MoE variants after the benchmark flow is stable

## 8. Example Outputs

### Example: 1x RTX 4090, 24 GB VRAM, 128 GB RAM, Linux

- backend: `vLLM` for the default best one-model lane
- backend: `llama.cpp` only for host-RAM offload comparisons
- harness: any client that can hit `http://localhost:8000/v1`
- baseline model lane: highest-scoring discovered all-purpose quantized model
- comparison lane: discovered coder-specialist, uncensored, GGUF/offload, and alternate quantization candidates
- benchmark posture: fixed context, fixed sampling, one request at a time

Reasoning:

- 24 GB VRAM is the main constraint
- 128 GB RAM does not turn the 4090 into a 128 GB GPU, but it does make GGUF offload experiments legitimate after the default baseline
- the first priority should be the strongest single model that fits cleanly and serves through a stable API

### Example: CPU-only or portability-first machine

- backend: `llama.cpp`
- model lane: GGUF quantized models sized conservatively to RAM
- harness: any local client that supports an OpenAI-compatible endpoint

### Example: Apple Silicon machine

- backend: `MLX`
- fallback: `llama.cpp`
- model lane: sized to unified memory with context headroom

## 9. Resources

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
  "version": "v2026.05",
  "engines": {
    "vllm": {
      "key": "vllm",
      "label": "vLLM",
      "controlPlane": "Direct runtime",
      "apiShape": "OpenAI-compatible server on :8000",
      "link": "https://github.com/vllm-project/vllm",
      "commands": {
        "install": "pip install -U \"vllm>=0.15.0\"",
        "fetch": "huggingface-cli download \"{{model}}\"",
        "serve": "vllm serve \"{{model}}\" --host 0.0.0.0 --port 8000 --max-model-len 32768 --gpu-memory-utilization 0.92"
      }
    },
    "llama.cpp": {
      "key": "llama.cpp",
      "label": "llama.cpp",
      "controlPlane": "Direct runtime",
      "apiShape": "OpenAI-compatible llama-server endpoint",
      "link": "https://github.com/ggml-org/llama.cpp",
      "commands": {
        "install": "Build or install llama.cpp with CUDA server support",
        "fetch": "huggingface-cli download \"{{model}}\"",
        "serve": "llama-server -hf \"{{modelRef}}\" --host 0.0.0.0 --port 8000"
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
        "when": {
          "isPhone": true
        },
        "value": "llama.cpp",
        "reason": "Phone and Termux-class hardware needs the most portable GGUF runtime with CPU/shared-memory tolerance."
      },
      {
        "when": {
          "isApple": true
        },
        "value": "mlx",
        "reason": "Apple Silicon should prefer MLX first, with llama.cpp as the fallback path."
      },
      {
        "when": {
          "isLinux": true,
          "isNvidia": true,
          "any": [
            {
              "dedicatedGpuCount": {
                "gt": 1
              }
            },
            {
              "effectiveMemory": {
                "gte": 48
              }
            }
          ]
        },
        "value": "vllm",
        "reason": "Linux plus multi-GPU or very large effective GPU memory should standardize on vLLM."
      },
      {
        "when": {
          "isLinux": true,
          "isNvidia": true,
          "vram": {
            "gte": 20
          }
        },
        "value": "vllm",
        "reason": "A single 24GB-class NVIDIA Linux box should use direct vLLM for the best one-model baseline when a strong quantized model fits."
      },
      {
        "when": {
          "isAMD": true,
          "hasDedicatedGpu": true
        },
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
        "when": {
          "isPhone": true
        },
        "value": "OpenCode",
        "reason": "Phone workflows benefit from the lightest onboarding path and straightforward local endpoint support."
      },
      {
        "when": {
          "cpuOnly": true
        },
        "value": "Pi",
        "reason": "CPU-only systems benefit from Pi's minimal context bloat and strong token caching."
      },
      {
        "when": {
          "hasDedicatedGpu": false,
          "totalRam": {
            "lte": 16
          }
        },
        "value": "Pi",
        "reason": "Lower-memory systems benefit from Pi's minimal context bloat and strong token caching."
      },
      {
        "when": {
          "useCase": [
            "agentic",
            "coding",
            "reasoning"
          ]
        },
        "value": "Droid",
        "reason": "Droid is the default harness for coding and agentic workflows."
      },
      {
        "when": {},
        "value": "Droid",
        "reason": "Droid is the default harness unless the user needs a lighter path."
      }
    ],
    "model": [],
    "context": [
      {
        "when": {
          "engine": "vllm",
          "isNvidia": true,
          "vram": {
            "gte": 20
          },
          "totalRam": {
            "gte": 96
          }
        },
        "value": 32768
      },
      {
        "when": {
          "engine": "vllm",
          "effectiveMemory": {
            "gte": 48
          }
        },
        "value": 32768
      },
      {
        "when": {
          "engine": "vllm",
          "vram": {
            "gte": 20
          }
        },
        "value": 16384
      },
      {
        "when": {
          "engine": "mlx",
          "totalRam": {
            "gte": 24
          }
        },
        "value": 32768
      },
      {
        "when": {
          "engine": "llama.cpp",
          "isPhone": true
        },
        "value": 8192
      },
      {
        "when": {
          "effectiveMemory": {
            "gte": 16
          }
        },
        "value": 16384
      },
      {
        "when": {},
        "value": 8192
      }
    ],
    "alternatives": [],
    "notes": [
      {
        "when": {
          "isWindows": true,
          "engine": [
            "vllm",
            "exllamav3"
          ]
        },
        "value": "Windows works, but Linux or WSL2 is still the cleaner NVIDIA runtime path."
      },
      {
        "when": {
          "engine": "vllm",
          "effectiveMemory": {
            "gte": 48
          }
        },
        "value": "Use tensor parallel for multi-GPU or larger-memory vLLM serving."
      },
      {
        "when": {
          "engine": "vllm",
          "isNvidia": true,
          "totalRam": {
            "gte": 96
          },
          "vram": {
            "gte": 20
          }
        },
        "value": "Discovery-first policy: select the highest-scoring Hugging Face candidate for this hardware, then surface uncensored and runtime-specific alternatives for benchmark comparison."
      },
      {
        "when": {
          "engine": "vllm",
          "vram": {
            "gte": 20
          }
        },
        "value": "Start at 32K context on a 24GB 4090; reduce to 16K only if the server fails to start or benchmark latency is unacceptable."
      },
      {
        "when": {
          "engine": "llama.cpp"
        },
        "value": "Keep context conservative on shared-memory or CPU-first devices."
      },
      {
        "when": {
          "engine": "mlx"
        },
        "value": "Leave headroom in unified memory for the OS and tools."
      }
    ]
  }
}
```
