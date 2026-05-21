const fs = require('fs');
const path = require('path');

const { normalizePlatform, isTermuxEnvironment } = require('../utils/platform');
const { estimateTokenSpeedFromHardware } = require('../utils/token-speed-estimator');

const GUIDE_SOURCE = 'guide.md';
const GUIDE_PATH = path.resolve(__dirname, '../../guide.md');

function asNumber(...values) {
    for (const value of values) {
        const numeric = Number(value);
        if (Number.isFinite(numeric) && numeric > 0) {
            return numeric;
        }
    }
    return 0;
}

function includesAny(text, patterns) {
    const haystack = String(text || '').toLowerCase();
    return patterns.some((pattern) => haystack.includes(pattern));
}

function normalizeUseCase(useCase = 'general') {
    const value = String(useCase || 'general').trim().toLowerCase();
    if (!value) return 'general';

    const aliases = {
        chat: 'talking',
        conversation: 'talking',
        talk: 'talking',
        code: 'coding',
        agent: 'agentic',
        agents: 'agentic',
        agentic: 'agentic',
        vision: 'multimodal',
        embedding: 'reading',
        embeddings: 'reading',
        reasoning: 'reasoning',
        writing: 'creative'
    };

    return aliases[value] || value;
}

function getSignals(hardware = {}, options = {}) {
    const summary = hardware.summary || {};
    const gpu = hardware.gpu || {};
    const cpu = hardware.cpu || {};
    const memory = hardware.memory || {};
    const system = hardware.system || {};
    const os = hardware.os || {};

    const rawPlatform = String(os.platformRaw || os.platform || process.platform).toLowerCase();
    const platform = normalizePlatform(rawPlatform || process.platform);
    const gpuModel = String(gpu.model || summary.gpuModel || '').trim();
    const gpuVendor = String(gpu.vendor || '').trim();
    const cpuBrand = String(cpu.brand || '').trim();
    const systemModel = String(system.model || '').trim();
    const totalRam = asNumber(memory.total, summary.systemRAM);
    const vram = asNumber(gpu.vram, summary.totalVRAM);
    const hasDedicatedGpu = Boolean(summary.hasDedicatedGPU || gpu.dedicated || (vram > 0 && !gpu.unified));
    const effectiveMemory = asNumber(
        gpu.unified
            ? summary.effectiveMemory
            : undefined,
        hasDedicatedGpu ? vram : undefined,
        summary.effectiveMemory,
        totalRam
    );
    const gpuCount = asNumber(gpu.gpuCount, Array.isArray(gpu.all) ? gpu.all.length : 0, gpu.model ? 1 : 0);
    const dedicatedGpuCount = asNumber(summary.dedicatedGpuCount, gpu.dedicated ? gpuCount : 0);
    const combinedGpuText = `${gpuVendor} ${gpuModel}`.toLowerCase();
    const isApple = platform === 'darwin' || includesAny(`${cpuBrand} ${gpuModel}`, ['apple', 'm1', 'm2', 'm3', 'm4']);
    const isPhone = rawPlatform === 'android' ||
        isTermuxEnvironment(rawPlatform, options.env || process.env) ||
        includesAny(`${systemModel} ${cpuBrand}`, ['phone', 'pixel', 'galaxy', 'snapdragon', 'dimensity']);
    const isNvidia = includesAny(combinedGpuText, ['nvidia', 'geforce', 'rtx', 'gtx', 'quadro', 'tesla', 'a100', 'h100', 'a6000', 'rtx 6000']);
    const isBlackwell = includesAny(combinedGpuText, ['blackwell', 'b200', 'b300', 'gb200', 'gb300', 'rtx 50', 'rtx 5090', 'rtx 5080', 'rtx 5070']);
    const isAMD = includesAny(combinedGpuText, ['amd', 'radeon', 'instinct', 'rx ']);
    const isIntelGpu = includesAny(combinedGpuText, ['intel', 'arc', 'iris', 'uhd']);
    return {
        platform,
        rawPlatform,
        gpuModel,
        cpuBrand,
        systemModel,
        totalRam,
        vram,
        effectiveMemory,
        gpuCount,
        dedicatedGpuCount,
        backend: String(summary.bestBackend || gpu.backend || 'cpu').toLowerCase(),
        isApple,
        isPhone,
        isLinux: platform === 'linux',
        isWindows: platform === 'win32',
        isNvidia,
        isBlackwell,
        isAMD,
        isIntelGpu,
        hasDedicatedGpu,
        unifiedMemory: Boolean(gpu.unified || summary.bestBackend === 'metal' || isApple),
        cpuOnly: !hasDedicatedGpu && !isApple && !isPhone && !isAMD && !isNvidia && !isIntelGpu
    };
}

let cachedPolicy = null;

function extractPolicyBlock(markdown) {
    const match = String(markdown || '').match(/## 10\. Machine-Readable Policy[\s\S]*?```json\s*([\s\S]*?)```/i);
    if (!match) {
        throw new Error(`Could not find machine-readable policy block in ${GUIDE_SOURCE}`);
    }
    return JSON.parse(match[1]);
}

function loadGuidePolicy() {
    if (cachedPolicy) return cachedPolicy;

    const markdown = fs.readFileSync(GUIDE_PATH, 'utf8');
    cachedPolicy = extractPolicyBlock(markdown);
    return cachedPolicy;
}

function compareNumeric(actual, expected = {}) {
    if (!Number.isFinite(actual)) return false;
    if (expected.gt !== undefined && !(actual > expected.gt)) return false;
    if (expected.gte !== undefined && !(actual >= expected.gte)) return false;
    if (expected.lt !== undefined && !(actual < expected.lt)) return false;
    if (expected.lte !== undefined && !(actual <= expected.lte)) return false;
    return true;
}

function matchesValue(actual, expected) {
    if (Array.isArray(expected)) {
        return expected.includes(actual);
    }

    if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
        if (Object.prototype.hasOwnProperty.call(expected, 'gt') ||
            Object.prototype.hasOwnProperty.call(expected, 'gte') ||
            Object.prototype.hasOwnProperty.call(expected, 'lt') ||
            Object.prototype.hasOwnProperty.call(expected, 'lte')) {
            return compareNumeric(Number(actual), expected);
        }
    }

    return actual === expected;
}

function matchesCriteria(criteria = {}, context = {}) {
    if (!criteria || Object.keys(criteria).length === 0) return true;

    if (Array.isArray(criteria.all) && !criteria.all.every((item) => matchesCriteria(item, context))) {
        return false;
    }

    if (Array.isArray(criteria.any) && !criteria.any.some((item) => matchesCriteria(item, context))) {
        return false;
    }

    if (criteria.not && matchesCriteria(criteria.not, context)) {
        return false;
    }

    return Object.entries(criteria).every(([key, expected]) => {
        if (key === 'all' || key === 'any' || key === 'not') return true;
        return matchesValue(context[key], expected);
    });
}

function chooseRule(rules = [], context = {}) {
    return rules.find((rule) => matchesCriteria(rule.when, context)) || null;
}

function pickUseCaseValue(value, useCase) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return value;
    }

    return value[useCase] || value.default || value.general || value;
}

function slugifyFamily(text = '') {
    return String(text || 'model')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'model';
}

function slugifyModelDirectory(text = '') {
    return String(text || 'model')
        .trim()
        .replace(/[\\/]+/g, '-')
        .replace(/[^A-Za-z0-9._-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '') || 'model';
}

function getRuntimeModelRef(model = {}) {
    const name = model.name || '';
    const format = String(model.format || '');
    const ggufQuant = format.match(/\b(I?Q\d(?:_[A-Z0-9]+)+|Q\d(?:_[A-Z0-9]+)+)\b/i);
    if (name && format.toLowerCase().includes('gguf') && ggufQuant) {
        return `${name}:${ggufQuant[1].toUpperCase()}`;
    }
    return name;
}

function fillTemplate(template, model = {}, harness = {}) {
    const modelDir = slugifyModelDirectory(model.name || model.family || 'model');
    const values = {
        model: model.name || '',
        modelRef: getRuntimeModelRef(model),
        family: model.family || 'model',
        familySlug: slugifyFamily(model.family || 'model'),
        modelDir,
        modelPath: `../models/${modelDir}`,
        modelFile: slugifyFamily(model.family || 'model'),
        harness: harness.name || ''
    };

    return String(template || '').replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] || '');
}

function extractModelId(input = '') {
    const text = String(input || '').trim();
    if (!text) return '';

    const hfPrefix = 'https://huggingface.co/';
    if (text.startsWith(hfPrefix)) {
        const withoutPrefix = text.slice(hfPrefix.length).split(/[?#]/)[0];
        const parts = withoutPrefix.split('/').filter(Boolean);
        if (parts.length >= 2) {
            return `${parts[0]}/${parts[1]}`;
        }
    }

    return text.replace(/^hf:\/\//i, '').split(/[?#]/)[0];
}

function inferModelFamily(modelId = '', metadata = {}) {
    const configType = String(metadata?.config?.model_type || '').trim();
    if (configType) return configType;

    const lower = String(modelId || '').toLowerCase();
    if (lower.includes('coder')) return 'coder';
    if (lower.includes('qwen')) return 'qwen';
    if (lower.includes('gemma')) return 'gemma';
    if (lower.includes('kimi')) return 'kimi';
    return 'model';
}

function inferModelFormat(modelId = '', metadata = {}) {
    const lower = String(modelId || '').toLowerCase();
    const tags = Array.isArray(metadata?.tags) ? metadata.tags.map((tag) => String(tag).toLowerCase()) : [];
    const quantMethod = String(metadata?.config?.quantization_config?.quant_method || '').toLowerCase();
    const bits = Number(metadata?.config?.quantization_config?.bits);
    const safetensorTypes = Object.keys(metadata?.safetensors?.parameters || {}).map((key) => String(key).toUpperCase());
    const ggufQuantMatch = lower.match(/\b(i?q\d(?:_[a-z0-9]+)+)\b/i);
    const exl2Match = lower.match(/\b(\d+(?:\.\d+)?)bpw\b/i);

    if (quantMethod === 'nvfp4' || tags.includes('nvfp4')) {
        return 'NVFP4';
    }
    if (quantMethod === 'fp8' || tags.includes('fp8') || safetensorTypes.some((key) => key.startsWith('F8_'))) {
        return 'FP8';
    }
    if (quantMethod === 'awq' || tags.includes('awq')) {
        if (Number.isFinite(bits) && bits > 0) return `AWQ ${bits}-bit`;
        return 'AWQ 4-bit';
    }
    if (lower.includes('awq')) return 'AWQ 4-bit';
    if (lower.includes('gptq') || tags.includes('gptq')) return 'GPTQ 4-bit';
    if (ggufQuantMatch) return `GGUF ${ggufQuantMatch[1].toUpperCase()}`;
    if (tags.includes('gguf') || lower.includes('gguf')) return 'GGUF';
    if (tags.includes('mlx') || lower.includes('mlx')) return 'MLX';
    if (lower.includes('nvfp4')) return 'NVFP4';
    if (lower.includes('fp8')) return 'FP8';
    if (lower.includes('w4a16') || lower.includes('autoround') || lower.includes('4bit') || lower.includes('4-bit')) {
        return 'W4A16 / 4-bit';
    }
    if (lower.includes('exl2') || tags.includes('exl2')) {
        return exl2Match ? `EXL2 ${exl2Match[1]}bpw` : 'EXL2';
    }
    if (lower.includes('reap') && (lower.includes('w4a16') || tags.includes('4-bit') || tags.includes('awq'))) {
        return 'REAP + low-bit quant';
    }
    if (lower.includes('reap')) return 'REAP pruned bf16/f16 weights';
    if (safetensorTypes.includes('F16')) return 'F16';
    if (safetensorTypes.includes('BF16')) return 'BF16';
    if (tags.includes('4-bit')) return '4-bit quant';
    return 'native weights';
}

function inferModelSource(modelId = '', metadata = {}) {
    const author = String(metadata?.author || '').trim();
    if (author) return `${author} on Hugging Face`;
    const namespace = String(modelId || '').split('/')[0] || 'Hugging Face';
    return `${namespace} on Hugging Face`;
}

function getModelCautionFlags(modelId = '', metadata = {}) {
    const haystack = [
        String(modelId || ''),
        ...(Array.isArray(metadata?.tags) ? metadata.tags : []),
        String(metadata?.cardData?.base_model || '')
    ].join(' ').toLowerCase();

    const flags = [];
    if (haystack.includes('uncensored')) flags.push('uncensored');
    if (haystack.includes('abliterated') || haystack.includes('obliterated')) flags.push('abliterated');
    if (haystack.includes('heretic')) flags.push('heretic');
    if (haystack.includes('refusal-removal')) flags.push('refusal-removal');
    return flags;
}

function buildModelCandidate(input = '', metadata = {}) {
    const modelId = extractModelId(input || metadata?.id || metadata?.modelId || '');
    const paramsTotal = Number(metadata?.safetensors?.total);
    const paramsB = Number.isFinite(paramsTotal) && paramsTotal > 0
        ? Number((paramsTotal / 1e9).toFixed(1))
        : undefined;

    return {
        name: modelId,
        format: inferModelFormat(modelId, metadata),
        family: inferModelFamily(modelId, metadata),
        source: inferModelSource(modelId, metadata),
        paramsB,
        tags: Array.isArray(metadata?.tags) ? metadata.tags : [],
        cautionFlags: getModelCautionFlags(modelId, metadata),
        downloads: Number(metadata?.downloads || 0),
        likes: Number(metadata?.likes || 0),
        lastModified: metadata?.lastModified || null,
        author: String(metadata?.author || '').trim(),
        metadata
    };
}

function buildCommands(policy = {}, engine = {}, model = {}, harness = {}) {
    const enginePolicy = (policy.engines || {})[engine.key] || {};
    const commandTemplates = enginePolicy.commands || {};

    return {
        install: fillTemplate(commandTemplates.install || '', model, harness),
        fetch: fillTemplate(commandTemplates.fetch || '', model, harness),
        serve: fillTemplate(commandTemplates.serve || '', model, harness),
        modelDir: fillTemplate('{{modelDir}}', model, harness),
        modelPath: fillTemplate('{{modelPath}}', model, harness),
        attach: `${harness.name} -> ${engine.key === 'mlx' ? 'local MLX bridge or OpenAI-compatible adapter' : 'http://localhost:8000/v1'}`
    };
}

function estimateModelSizeB(model = {}) {
    if (Number.isFinite(Number(model.paramsB)) && Number(model.paramsB) > 0) {
        return Number(model.paramsB);
    }

    const text = `${model.name || ''} ${model.family || ''}`;

    const match = text.match(/(\d+(?:\.\d+)?)B/i);
    if (match) return Number(match[1]);

    return 9;
}

function estimateActiveModelSizeB(model = {}) {
    const text = `${model.name || ''} ${model.family || ''}`;
    const lower = text.toLowerCase();
    const moeMatch = lower.match(/(\d+(?:\.\d+)?)b-a(\d+(?:\.\d+)?)b/i);
    if (moeMatch) {
        return Number(moeMatch[2]);
    }

    const eMatch = lower.match(/\be(\d+(?:\.\d+)?)b\b/i);
    if (eMatch) {
        return Number(eMatch[1]);
    }

    return null;
}

function estimateQualityClassSizeB(model = {}) {
    const total = estimateModelSizeB(model);
    const active = estimateActiveModelSizeB(model);
    if (!Number.isFinite(active) || active <= 0) return total;

    return Number(Math.min(total, (active * 5) + (total * 0.55)).toFixed(1));
}

function estimateSpeedClassSizeB(model = {}) {
    const total = estimateModelSizeB(model);
    const active = estimateActiveModelSizeB(model);
    if (!Number.isFinite(active) || active <= 0) return total;

    return Number(Math.min(total, Math.max(active * 4, active + (total * 0.35))).toFixed(1));
}

function estimateContextWindow(policy = {}, context = {}) {
    const rules = policy.rules?.context || [];
    const match = chooseRule(rules, context);
    return match ? Number(match.value) : 8192;
}

function estimatePerformance(hardware = {}, model = {}, contextWindow = 8192) {
    const modelSizeB = estimateSpeedClassSizeB(model);
    const estimate = estimateTokenSpeedFromHardware(hardware, { modelSizeB });
    const firstTokenSeconds = Number((Math.max(0.15, modelSizeB / Math.max(4, estimate.tokensPerSecond))).toFixed(2));

    return {
        modelSizeB,
        tokensPerSecond: estimate.tokensPerSecond,
        firstTokenSeconds,
        contextWindow,
        backendClass: estimate.backend
    };
}

function buildLinks(policy = {}, engine = {}, harness = {}, model = {}) {
    return {
        engine: policy.engines?.[engine.key]?.link || null,
        harness: policy.harnesses?.[harness.name]?.link || null,
        model: model.name ? `https://huggingface.co/${model.name}` : null
    };
}

function buildNotes(policy = {}, context = {}) {
    return (policy.rules?.notes || [])
        .filter((rule) => matchesCriteria(rule.when, context))
        .map((rule) => rule.value);
}

function buildAlternatives(policy = {}, context = {}, primary = {}) {
    const rule = chooseRule(policy.rules?.alternatives || [], context);
    const alternatives = Array.isArray(rule?.value) ? rule.value : [];
    return alternatives.filter((item) => item.name !== primary.name);
}

function getMatchingAlternativeCandidates(policy = {}, context = {}) {
    return (policy.rules?.alternatives || [])
        .filter((rule) => matchesCriteria(rule.when, context))
        .flatMap((rule) => Array.isArray(rule.value) ? rule.value : []);
}

function dedupeModels(models = []) {
    const byName = new Map();

    models.forEach((model) => {
        if (!model?.name) return;

        const existing = byName.get(model.name);
        if (!existing) {
            byName.set(model.name, model);
            return;
        }

        const existingRichness = [
            existing.format && existing.format !== 'native weights',
            Number(existing.downloads || 0) > 0,
            Number(existing.likes || 0) > 0,
            Array.isArray(existing.tags) && existing.tags.length > 0,
            Number(existing.paramsB || 0) > 0
        ].filter(Boolean).length;

        const nextRichness = [
            model.format && model.format !== 'native weights',
            Number(model.downloads || 0) > 0,
            Number(model.likes || 0) > 0,
            Array.isArray(model.tags) && model.tags.length > 0,
            Number(model.paramsB || 0) > 0
        ].filter(Boolean).length;

        if (nextRichness > existingRichness) {
            byName.set(model.name, { ...existing, ...model });
        }
    });

    return Array.from(byName.values());
}

function getGuideModelCandidates(policy = {}, context = {}) {
    const models = (policy.rules?.model || [])
        .filter((rule) => matchesCriteria(rule.when, context))
        .map((rule) => pickUseCaseValue(rule.value, context.useCase))
        .filter((model) => model?.name);

    return dedupeModels(models);
}

function getQuantizationFactor(format = '') {
    const text = String(format || '').toLowerCase();
    if (text.includes('nvfp4')) return 0.45;
    if (text.includes('fp8')) return 0.68;
    if (text.includes('w4a16') || text.includes('4-bit') || text.includes('q4') || text.includes('4.0bpw') || text.includes('awq') || text.includes('gptq')) return 0.55;
    if (text.includes('q5')) return 0.67;
    if (text.includes('q6')) return 0.78;
    if (text.includes('q8')) return 0.95;
    if (text.includes('reap')) return 1.9;
    if (text.includes('mlx')) return 0.58;
    if (text.includes('bf16') || text.includes('f16') || text.includes('fp16')) return 1.05;
    return 1.0;
}

function estimateWorkingSetGB(model = {}) {
    const modelSizeB = estimateModelSizeB(model);
    const quantFactor = getQuantizationFactor(model.format);
    const overhead = modelSizeB >= 32 ? 3 : 2;
    return Number((modelSizeB * quantFactor + overhead).toFixed(1));
}

function getBudgetGB(context = {}) {
    if (context.engine === 'mlx') return Number(context.totalRam || context.effectiveMemory || 0);
    return Number(context.effectiveMemory || context.vram || context.totalRam || 0);
}

function getHostOffloadHeadroomGB(context = {}) {
    const totalRam = Number(context.totalRam || 0);
    const vram = Number(context.vram || 0);
    if (totalRam <= 0 || context.engine === 'mlx') return 0;

    const reserve = context.isWindows ? 16 : 12;
    const available = Math.max(0, totalRam - reserve - Math.max(0, vram * 0.25));

    if (context.engine === 'vllm') return Math.min(28, Math.max(0, available * 0.35));
    if (context.engine === 'llama.cpp') return Math.min(40, Math.max(0, available * 0.55));
    return Math.min(24, Math.max(0, available * 0.4));
}

function getUseCaseAffinity(model = {}, useCase = 'general') {
    const text = `${model.name || ''} ${model.family || ''}`.toLowerCase();
    const isCoder = text.includes('coder');
    const isAgentModel = text.includes('agent') || text.includes('tool') || text.includes('function') || text.includes('search') || text.includes('browser');
    const isVisionModel = text.includes('vision') || text.includes('vl') || text.includes('image') || text.includes('multimodal');
    const isInstruct = text.includes('instruct');

    if (useCase === 'coding') {
        if (isCoder && isAgentModel) return 18;
        if (isCoder) return 16;
        if (isAgentModel) return 14;
        if (isInstruct) return 3;
        return 0;
    }

    if (useCase === 'agentic') {
        if (isAgentModel) return 15;
        if (isCoder) return 10;
        if (isInstruct) return 8;
        return 8;
    }

    if (useCase === 'general') {
        if (isInstruct && isVisionModel) return 13;
        if (isInstruct && isAgentModel) return 12;
        if (isInstruct) return 8;
        if (isCoder) return 2;
        return 8;
    }

    return 4;
}

function getSourcePreference(model = {}) {
    return 0;
}

function getPopularityPreference(model = {}) {
    const downloads = Math.max(0, Number(model.downloads || 0));
    const likes = Math.max(0, Number(model.likes || 0));
    if (downloads <= 0 && likes <= 0) return 0;
    return Math.min(6, Number((Math.log10(downloads + 10) + Math.log10((likes * 10) + 10) - 2).toFixed(1)));
}

function matchesUncensoredFocus(model = {}) {
    const cautionFlags = Array.isArray(model.cautionFlags) ? model.cautionFlags : [];
    if (cautionFlags.some((flag) => ['uncensored', 'abliterated', 'heretic', 'refusal-removal'].includes(String(flag).toLowerCase()))) {
        return true;
    }

    const text = [
        String(model.name || ''),
        String(model.source || ''),
        ...(Array.isArray(model.tags) ? model.tags : [])
    ].join(' ').toLowerCase();

    return ['uncensored', 'abliterated', 'obliterated', 'heretic', 'refusal-removal']
        .some((term) => text.includes(term));
}

function getFreshnessPreference(model = {}) {
    const lastModified = Date.parse(model.lastModified || '');
    if (!Number.isFinite(lastModified)) return 0;

    const ageDays = Math.max(0, (Date.now() - lastModified) / (1000 * 60 * 60 * 24));
    if (ageDays <= 3) return 2.5;
    if (ageDays <= 14) return 1.8;
    if (ageDays <= 45) return 1.0;
    if (ageDays <= 120) return 0.4;
    return 0;
}

function getCautionPenalty(model = {}) {
    const flags = Array.isArray(model.cautionFlags) ? model.cautionFlags : [];
    if (flags.length === 0) return 0;
    return Math.min(9, flags.length * 3);
}

function getEngineFormatPreference(model = {}, context = {}) {
    const format = String(model.format || '').toLowerCase();
    const engine = String(context.engine || '').toLowerCase();

    if (engine === 'vllm') {
        if (format.includes('gguf') || format.includes('mlx')) return -18;
        if (format.includes('nvfp4') && !context.isBlackwell) return -10;
        if (format.includes('awq') || format.includes('gptq') || format.includes('w4a16') || format.includes('reap') || format.includes('fp8') || format.includes('nvfp4') || format.includes('native') || format.includes('bf16') || format.includes('f16')) return 6;
        return 0;
    }

    if (engine === 'llama.cpp') {
        if (format.includes('gguf')) return 8;
        if (format.includes('mlx')) return -12;
        return -16;
    }

    if (engine === 'mlx') {
        if (format.includes('mlx')) return 8;
        if (format.includes('gguf')) return -10;
        return -4;
    }

    return 0;
}

function getFormatMismatchReason(model = {}, context = {}) {
    const format = String(model.format || '').toLowerCase();
    const engine = String(context.engine || '').toLowerCase();

    if (engine === 'vllm' && (format.includes('gguf') || format.includes('mlx'))) {
        return 'This build targets GGUF/MLX workflows rather than native vLLM serving.';
    }

    if (engine === 'llama.cpp' && !format.includes('gguf')) {
        return 'This build is not a GGUF-first llama.cpp target.';
    }

    if (engine === 'mlx' && !format.includes('mlx')) {
        return 'This build is not an MLX-native target.';
    }

    return '';
}

function classifyFit(model = {}, context = {}) {
    const budgetGB = Math.max(0, getBudgetGB(context));
    const workingSetGB = estimateWorkingSetGB(model);
    const offloadHeadroomGB = getHostOffloadHeadroomGB(context);
    const pressureRatio = budgetGB > 0 ? workingSetGB / budgetGB : 99;
    const rescueRatio = (budgetGB + offloadHeadroomGB) > 0 ? workingSetGB / (budgetGB + offloadHeadroomGB) : 99;

    if (pressureRatio <= 0.72) {
        return { fitScore: 14, fitLabel: 'comfortable', pressureRatio, fitMode: 'gpu-resident' };
    }
    if (pressureRatio <= 0.9) {
        return { fitScore: 9, fitLabel: 'balanced', pressureRatio, fitMode: 'gpu-resident' };
    }
    if (pressureRatio <= 1.0) {
        return { fitScore: 3, fitLabel: 'tight', pressureRatio, fitMode: 'gpu-resident' };
    }
    if (rescueRatio <= 1.0) {
        return { fitScore: -10, fitLabel: 'hybrid offload', pressureRatio, fitMode: 'hybrid-offload' };
    }
    if (rescueRatio <= 1.12) {
        return { fitScore: -24, fitLabel: 'experimental offload', pressureRatio, fitMode: 'experimental-offload' };
    }
    return { fitScore: -42, fitLabel: 'clear loser on fit', pressureRatio, fitMode: 'poor-fit' };
}

function estimateCandidateContextWindow(policy = {}, context = {}, model = {}) {
    const baseContext = estimateContextWindow(policy, context);
    const fit = classifyFit(model, context);
    const workingSetGB = estimateWorkingSetGB(model);
    const budgetGB = Math.max(1, getBudgetGB(context));

    if (fit.fitMode === 'experimental-offload') return Math.max(4096, Math.round(baseContext / 4));
    if (fit.fitMode === 'hybrid-offload') return Math.max(8192, Math.round(baseContext / 2));
    if (workingSetGB > budgetGB * 0.9) return Math.max(8192, Math.round(baseContext * 0.75));
    return baseContext;
}

function buildTradeoffSummary(model = {}, context = {}, performance = {}, fit = {}) {
    const qualitySizeB = estimateQualityClassSizeB(model);
    const activeSizeB = estimateActiveModelSizeB(model);
    const parts = [];

    if (Number.isFinite(activeSizeB) && activeSizeB > 0) {
        parts.push(`MoE-style quality above its active ${activeSizeB}B path`);
    } else if (qualitySizeB >= 28) {
        parts.push('stronger quality tier');
    } else if (qualitySizeB >= 12) {
        parts.push('balanced quality tier');
    } else {
        parts.push('faster but lighter model class');
    }

    if (performance.tokensPerSecond >= 50) {
        parts.push('fast decode');
    } else if (performance.tokensPerSecond >= 20) {
        parts.push('midrange decode');
    } else {
        parts.push('slower decode');
    }

    if (fit.fitMode === 'gpu-resident') {
        parts.push('good headroom for context');
    } else if (fit.fitMode === 'hybrid-offload') {
        parts.push('needs host RAM offload and shorter context');
    } else if (fit.fitMode === 'experimental-offload') {
        parts.push('experimental fit; benchmark first');
    } else if (fit.fitMode === 'poor-fit') {
        parts.push('unlikely to be pleasant on this box');
    }

    if (context.engine === 'vllm' && String(model.format || '').toLowerCase().includes('gguf')) {
        parts.push('format mismatch for vLLM');
    }

    if (matchesUncensoredFocus(model)) {
        parts.push('uncensored variant');
    }

    if (String(model.format || '').toLowerCase().includes('nvfp4') && !context.isBlackwell) {
        parts.push('NVFP4 should be benchmarked on non-Blackwell NVIDIA GPUs');
    }

    return parts.join('; ');
}

function classifyRunLabel(model = {}, context = {}, fit = {}, performance = {}) {
    const mismatchReason = getFormatMismatchReason(model, context);
    if (mismatchReason) {
        return {
            label: 'format mismatch',
            reason: mismatchReason
        };
    }

    if (String(model.format || '').toLowerCase().includes('nvfp4') && !context.isBlackwell) {
        return {
            label: 'experimental',
            reason: 'NVFP4 checkpoints are optimized for Blackwell-class NVIDIA hardware; benchmark this on Ada/Ampere before relying on it.'
        };
    }

    if (fit.fitMode === 'poor-fit' || fit.fitMode === 'experimental-offload') {
        return {
            label: 'experimental',
            reason: 'This candidate is outside the comfortable fit range for the current hardware and should be benchmarked before relying on it.'
        };
    }

    if (fit.fitMode === 'hybrid-offload' || fit.fitLabel === 'tight') {
        return {
            label: 'likely',
            reason: 'This candidate should run, but it likely needs either reduced context or host-memory offload to feel stable.'
        };
    }

    if (fit.fitMode === 'gpu-resident' && performance.tokensPerSecond >= 6) {
        return {
            label: 'confirmed',
            reason: 'This candidate fits the selected runtime cleanly and should be a safe default for this hardware class.'
        };
    }

    return {
        label: 'likely',
        reason: 'This candidate looks viable, but it is not as clean a baseline as the confirmed options.'
    };
}

function scoreModelCandidate(model = {}, context = {}, primaryName = '') {
    const budgetGB = Math.max(0, getBudgetGB(context));
    const workingSetGB = estimateWorkingSetGB(model);
    const modelSizeB = estimateQualityClassSizeB(model);
    const useCaseAffinity = getUseCaseAffinity(model, context.useCase);
    const sourcePreference = getSourcePreference(model);
    const popularityPreference = getPopularityPreference(model);
    const freshnessPreference = getFreshnessPreference(model);
    const cautionPenalty = getCautionPenalty(model, context);
    const formatPreference = getEngineFormatPreference(model, context);
    const sizeScore = Math.min(modelSizeB, 72) / 2;
    const fit = classifyFit(model, context);
    const score = Number((sizeScore + useCaseAffinity + sourcePreference + popularityPreference + freshnessPreference + formatPreference + fit.fitScore - cautionPenalty + (model.name === primaryName ? 1.5 : 0)).toFixed(1));

    return {
        ...model,
        estimatedSizeB: modelSizeB,
        estimatedDenseSizeB: estimateModelSizeB(model),
        estimatedActiveSizeB: estimateActiveModelSizeB(model),
        estimatedWorkingSetGB: workingSetGB,
        score,
        pressureRatio: fit.pressureRatio,
        fitLabel: fit.fitLabel,
        fitMode: fit.fitMode,
        budgetGB
    };
}

function choosePreferredDefaultCandidate(rankedCandidates = [], context = {}) {
    if (rankedCandidates.length === 0) return null;

    const topCandidate = rankedCandidates[0];
    if (
        context.engine === 'llama.cpp' &&
        Number(context.totalRam || 0) >= 96 &&
        ['hybrid-offload', 'gpu-resident'].includes(topCandidate.fitMode) &&
        !getFormatMismatchReason(topCandidate, context)
    ) {
        return topCandidate;
    }

    const gpuResidentCandidates = rankedCandidates.filter((candidate) =>
        candidate.fitMode === 'gpu-resident' && !getFormatMismatchReason(candidate, context)
    );

    if (gpuResidentCandidates.length === 0) {
        return rankedCandidates[0];
    }

    if (topCandidate.fitMode === 'gpu-resident' && !getFormatMismatchReason(topCandidate, context)) {
        return topCandidate;
    }

    return gpuResidentCandidates[0];
}

function rankModelCandidates(policy = {}, context = {}, primary = {}, discoveredCandidates = []) {
    const primaryModels = primary?.name ? [primary] : [];
    const candidates = dedupeModels([
        ...primaryModels,
        ...getGuideModelCandidates(policy, context),
        ...getMatchingAlternativeCandidates(policy, context),
        ...discoveredCandidates
    ]);

    return candidates
        .map((model) => scoreModelCandidate(model, context, primary?.name || ''))
        .sort((left, right) => right.score - left.score);
}

function buildFrontierComparison(model = {}, context = {}) {
    const sizeB = estimateModelSizeB(model);
    const workingSetGB = estimateWorkingSetGB(model);
    const useCase = context.useCase || 'general';
    const leader = useCase === 'coding' || useCase === 'agentic'
        ? 'Claude Opus 4.6 / GPT-5.4'
        : 'GPT-5.4 / Claude Opus 4.6';

    let closest = 'below GPT-4-class';
    let summary = `This local pick is well below ${leader} and should not be treated as frontier-cloud-equivalent.`;

    if (sizeB >= 28 || workingSetGB >= 18) {
        closest = 'best case: GPT-4o-class on narrower tasks';
        summary = `This is a strong open local tier that may feel GPT-4o-class on narrower tasks, but it remains below ${leader} on hard multi-step work.`;
    } else if (sizeB >= 12) {
        closest = 'roughly GPT-4-era usefulness on narrower work';
        summary = `This should be thought of as practical local GPT-4-era usefulness on narrower tasks, not as a peer to ${leader}.`;
    }

    return {
        leader,
        closest,
        summary,
        inference: 'Inference from open-model class, size, and fit heuristics rather than direct benchmark equivalence.'
    };
}

function buildModelReason(selectedModel = {}, primaryModel = {}, selectionContext = {}) {
    if (selectedModel.reason) return selectedModel.reason;

    if (!primaryModel?.name) {
        return 'This model led the live Hugging Face discovery results after scoring hardware fit, use-case alignment, recency, popularity, and runtime compatibility.';
    }

    if (primaryModel?.name && selectedModel.name === primaryModel.name) {
        return 'This model stayed ahead after scoring fit, use-case alignment, and source preference across the compatible shortlist.';
    }

    if (`${selectedModel.name} ${selectedModel.source || ''}`.toLowerCase().includes('0xsero')) {
        return 'This community build outranked the conservative default once shortlist scoring and source preference were applied.';
    }

    return `This alternative outranked the conservative default for ${selectionContext.useCase || 'the current'} work once shortlist scoring was applied.`;
}

function buildRecommendationContext(hardware = {}, options = {}) {
    const policy = loadGuidePolicy();
    const signals = getSignals(hardware, options);
    const useCase = normalizeUseCase(options.useCase || options.category || 'general');

    const baseContext = { ...signals, useCase };
    const engine = chooseEngine(policy, baseContext);
    const harness = chooseHarness(policy, baseContext);
    const selectionContext = {
        ...baseContext,
        engine: engine.key,
        harness: harness.name
    };

    return {
        policy,
        signals,
        useCase,
        baseContext,
        engine,
        harness,
        selectionContext
    };
}

function chooseEngine(policy = {}, context = {}) {
    const rule = chooseRule(policy.rules?.engine || [], context);
    if (!rule) {
        throw new Error(`No engine rule matched from ${GUIDE_SOURCE}`);
    }

    const engine = policy.engines?.[rule.value];
    if (!engine) {
        throw new Error(`Unknown engine "${rule.value}" in ${GUIDE_SOURCE}`);
    }

    return {
        ...engine,
        reason: rule.reason
    };
}

function chooseHarness(policy = {}, context = {}) {
    const rule = chooseRule(policy.rules?.harness || [], context);
    if (!rule) {
        throw new Error(`No harness rule matched from ${GUIDE_SOURCE}`);
    }

    const harness = policy.harnesses?.[rule.value];
    if (!harness) {
        throw new Error(`Unknown harness "${rule.value}" in ${GUIDE_SOURCE}`);
    }

    return {
        ...harness,
        reason: rule.reason
    };
}

function chooseModel(policy = {}, context = {}, discoveredCandidates = []) {
    const rule = chooseRule(policy.rules?.model || [], context);
    const primaryModel = rule ? pickUseCaseValue(rule.value, context.useCase) : {};

    const rankedCandidates = rankModelCandidates(policy, context, primaryModel, discoveredCandidates);
    if (rankedCandidates.length === 0) {
        throw new Error('Could not rank model candidates from Hugging Face discovery results');
    }

    const selectedCandidate = choosePreferredDefaultCandidate(rankedCandidates, context) || rankedCandidates[0];
    const orderedCandidates = [
        selectedCandidate,
        ...rankedCandidates.filter((candidate) => candidate.name !== selectedCandidate.name)
    ];

    return {
        selected: selectedCandidate,
        primary: primaryModel?.name ? primaryModel : {},
        rankedCandidates: orderedCandidates
    };
}

function getGuideStackRecommendation(hardware = {}, options = {}) {
    const {
        policy,
        signals,
        useCase,
        engine,
        harness,
        selectionContext
    } = buildRecommendationContext(hardware, options);
    const discoveredCandidates = Array.isArray(options.discoveredModels)
        ? options.discoveredModels.map((item) => buildModelCandidate(item.input || item, item.metadata || {}))
        : [];
    const modelChoice = chooseModel(policy, selectionContext, discoveredCandidates);
    const model = modelChoice.selected;
    const contextWindow = estimateContextWindow(policy, selectionContext);
    const performance = estimatePerformance(hardware, model, contextWindow);
    const links = buildLinks(policy, engine, harness, model);
    const rankedCandidates = modelChoice.rankedCandidates.map((candidate) => {
        const candidateContextWindow = estimateCandidateContextWindow(policy, selectionContext, candidate);
        const candidatePerformance = estimatePerformance(hardware, candidate, candidateContextWindow);
        const candidateFit = classifyFit(candidate, selectionContext);
        const runLabel = classifyRunLabel(candidate, selectionContext, candidateFit, candidatePerformance);
        return {
            ...candidate,
            contextWindow: candidateContextWindow,
            performance: candidatePerformance,
            tradeoff: buildTradeoffSummary(candidate, selectionContext, candidatePerformance, candidateFit),
            runLabel: runLabel.label,
            runLabelReason: runLabel.reason
        };
    });
    const choiceLimit = Math.max(1, Number(options.topN) || 1);
    const topChoices = rankedCandidates.slice(0, choiceLimit);
    const uncensoredChoices = rankedCandidates
        .filter((candidate) => matchesUncensoredFocus(candidate))
        .slice(0, choiceLimit);
    const alternatives = topChoices.filter((item) => item.name !== model.name).slice(0, 4);
    const notes = buildNotes(policy, selectionContext);
    const frontierComparison = buildFrontierComparison(model, selectionContext);

    return {
        guideVersion: policy.version || 'unknown',
        guideSource: GUIDE_SOURCE,
        useCase,
        platform: {
            normalized: signals.platform,
            raw: signals.rawPlatform || signals.platform,
            class: signals.isPhone ? 'phone' : signals.platform
        },
        engine,
        harness,
        model,
        primaryModel: modelChoice.primary,
        candidates: rankedCandidates,
        topChoices,
        uncensoredChoices,
        alternatives,
        performance,
        links,
        frontierComparison,
        endpoint: engine.key === 'mlx' ? 'http://localhost:8000/v1 (bridge or compatible adapter)' : 'http://localhost:8000/v1',
        commands: buildCommands(policy, engine, model, harness),
        notes,
        hardwareProfile: {
            cpu: signals.cpuBrand || 'Unknown CPU',
            gpu: signals.gpuModel || 'No discrete GPU',
            ramGB: signals.totalRam,
            vramGB: signals.vram,
            effectiveMemoryGB: signals.effectiveMemory,
            backend: signals.backend || 'cpu'
        },
        rationale: [
            engine.reason,
            buildModelReason(model, modelChoice.primary, selectionContext),
            harness.reason,
            model.name !== modelChoice.primary.name
                ? `Picked from a scored Hugging Face shortlist instead of the conservative default.`
                : `Scored against the compatible Hugging Face shortlist and still won on fit, use-case, and source preference.`
        ]
    };
}

function rankExplicitModelCandidates(hardware = {}, modelInputs = [], options = {}) {
    const {
        policy,
        signals,
        useCase,
        engine,
        harness,
        selectionContext
    } = buildRecommendationContext(hardware, options);

    const candidates = dedupeModels(modelInputs.map((item) => buildModelCandidate(item.input || item, item.metadata || {})));
    const rankedCandidates = candidates
        .map((model) => scoreModelCandidate(model, selectionContext, ''))
        .sort((left, right) => right.score - left.score)
        .map((candidate) => {
            const candidateContextWindow = estimateCandidateContextWindow(policy, selectionContext, candidate);
            const candidatePerformance = estimatePerformance(hardware, candidate, candidateContextWindow);
            const candidateFit = classifyFit(candidate, selectionContext);
            const runLabel = classifyRunLabel(candidate, selectionContext, candidateFit, candidatePerformance);
            return {
                ...candidate,
                contextWindow: candidateContextWindow,
                performance: candidatePerformance,
                tradeoff: buildTradeoffSummary(candidate, selectionContext, candidatePerformance, candidateFit),
                runLabel: runLabel.label,
                runLabelReason: runLabel.reason
            };
        });

    const selected = rankedCandidates[0] || null;
    const contextWindow = estimateContextWindow(policy, selectionContext);

    return {
        guideVersion: policy.version || 'unknown',
        guideSource: GUIDE_SOURCE,
        useCase,
        engine,
        harness,
        contextWindow,
        rankedCandidates,
        selected,
        hardwareProfile: {
            cpu: signals.cpuBrand || 'Unknown CPU',
            gpu: signals.gpuModel || 'No discrete GPU',
            ramGB: signals.totalRam,
            vramGB: signals.vram,
            effectiveMemoryGB: signals.effectiveMemory,
            backend: signals.backend || 'cpu'
        }
    };
}

module.exports = {
    GUIDE_SOURCE,
    GUIDE_VERSION: loadGuidePolicy().version || 'unknown',
    buildRecommendationContext,
    getGuideStackRecommendation,
    buildModelCandidate,
    estimateModelSizeB,
    estimateActiveModelSizeB,
    estimateWorkingSetGB,
    rankExplicitModelCandidates
};
