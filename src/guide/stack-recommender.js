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
    const totalRam = asNumber(memory.total, summary.systemRAM, summary.effectiveMemory);
    const vram = asNumber(gpu.vram, summary.totalVRAM);
    const effectiveMemory = asNumber(
        summary.effectiveMemory,
        gpu.unified ? totalRam : vram,
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
    const isAMD = includesAny(combinedGpuText, ['amd', 'radeon', 'instinct', 'rx ']);
    const isIntelGpu = includesAny(combinedGpuText, ['intel', 'arc', 'iris', 'uhd']);
    const hasDedicatedGpu = Boolean(summary.hasDedicatedGPU || gpu.dedicated || (vram > 0 && !gpu.unified));

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

    if (Array.isArray(criteria.all)) {
        return criteria.all.every((item) => matchesCriteria(item, context));
    }

    if (Array.isArray(criteria.any)) {
        return criteria.any.some((item) => matchesCriteria(item, context));
    }

    if (criteria.not) {
        return !matchesCriteria(criteria.not, context);
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

function fillTemplate(template, model = {}, harness = {}) {
    const values = {
        model: model.name || '',
        family: model.family || 'model',
        familySlug: slugifyFamily(model.family || 'model'),
        modelFile: slugifyFamily(model.family || 'model'),
        harness: harness.name || ''
    };

    return String(template || '').replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] || '');
}

function buildCommands(policy = {}, engine = {}, model = {}, harness = {}) {
    const enginePolicy = (policy.engines || {})[engine.key] || {};
    const commandTemplates = enginePolicy.commands || {};

    return {
        install: fillTemplate(commandTemplates.install || '', model, harness),
        fetch: fillTemplate(commandTemplates.fetch || '', model, harness),
        serve: fillTemplate(commandTemplates.serve || '', model, harness),
        attach: `${harness.name} -> ${engine.key === 'mlx' ? 'local MLX bridge or OpenAI-compatible adapter' : 'http://localhost:8000/v1'}`
    };
}

function estimateModelSizeB(model = {}) {
    const text = `${model.name || ''} ${model.family || ''}`;
    const match = text.match(/(\d+(?:\.\d+)?)B/i);
    if (match) return Number(match[1]);

    if (/kimi-k2\.5/i.test(text)) return 72;
    if (/coder-next/i.test(text)) return 32;
    if (/gemma-3-27/i.test(text)) return 27;
    if (/gemma-3-12/i.test(text)) return 12;
    if (/gemma-3-4/i.test(text)) return 4;
    return 9;
}

function estimateContextWindow(policy = {}, context = {}) {
    const rules = policy.rules?.context || [];
    const match = chooseRule(rules, context);
    return match ? Number(match.value) : 8192;
}

function estimatePerformance(hardware = {}, model = {}, contextWindow = 8192) {
    const modelSizeB = estimateModelSizeB(model);
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

function chooseModel(policy = {}, context = {}) {
    const rule = chooseRule(policy.rules?.model || [], context);
    if (!rule) {
        throw new Error(`No model rule matched from ${GUIDE_SOURCE}`);
    }

    const model = pickUseCaseValue(rule.value, context.useCase);
    if (!model || !model.name) {
        throw new Error(`Invalid model rule in ${GUIDE_SOURCE}`);
    }

    return model;
}

function getGuideStackRecommendation(hardware = {}, options = {}) {
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
    const model = chooseModel(policy, selectionContext);
    const contextWindow = estimateContextWindow(policy, selectionContext);
    const performance = estimatePerformance(hardware, model, contextWindow);
    const links = buildLinks(policy, engine, harness, model);
    const alternatives = buildAlternatives(policy, selectionContext, model);
    const notes = buildNotes(policy, selectionContext);

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
        alternatives,
        performance,
        links,
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
            model.reason,
            harness.reason
        ]
    };
}

module.exports = {
    GUIDE_SOURCE,
    GUIDE_VERSION: loadGuidePolicy().version || 'unknown',
    getGuideStackRecommendation
};
