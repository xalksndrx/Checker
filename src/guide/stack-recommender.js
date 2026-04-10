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

function getMatchingAlternativeCandidates(policy = {}, context = {}) {
    return (policy.rules?.alternatives || [])
        .filter((rule) => matchesCriteria(rule.when, context))
        .flatMap((rule) => Array.isArray(rule.value) ? rule.value : []);
}

function dedupeModels(models = []) {
    const seen = new Set();
    const deduped = [];

    models.forEach((model) => {
        if (!model?.name) return;
        const key = `${model.name}::${model.format || ''}`;
        if (seen.has(key)) return;
        seen.add(key);
        deduped.push(model);
    });

    return deduped;
}

function matchesExpectedLoosely(expected, actual) {
    if (expected === undefined) return true;

    if (Array.isArray(expected)) {
        return expected.includes(actual);
    }

    return expected === actual;
}

function ruleIsCompatible(rule = {}, context = {}) {
    const when = rule.when || {};
    const compatibleKeys = ['engine', 'useCase', 'isPhone', 'isApple', 'isLinux', 'isWindows', 'isNvidia', 'isAMD', 'cpuOnly'];

    return compatibleKeys.every((key) => matchesExpectedLoosely(when[key], context[key]));
}

function getGuideModelCandidates(policy = {}, context = {}) {
    const models = (policy.rules?.model || [])
        .filter((rule) => ruleIsCompatible(rule, context))
        .map((rule) => pickUseCaseValue(rule.value, context.useCase))
        .filter((model) => model?.name);

    return dedupeModels(models);
}

function getQuantizationFactor(format = '') {
    const text = String(format || '').toLowerCase();
    if (text.includes('q5')) return 0.65;
    if (text.includes('q6')) return 0.78;
    if (text.includes('q8')) return 1.0;
    if (text.includes('4-bit') || text.includes('q4') || text.includes('4.0bpw') || text.includes('reap') || text.includes('awq')) return 0.55;
    if (text.includes('mlx')) return 0.58;
    return 0.8;
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

function getUseCaseAffinity(model = {}, useCase = 'general') {
    const text = `${model.name || ''} ${model.family || ''}`.toLowerCase();
    const isCoder = text.includes('coder');
    const isInstruct = text.includes('instruct');

    if (useCase === 'coding') {
        if (isCoder) return 12;
        if (isInstruct) return 3;
        return 0;
    }

    if (useCase === 'agentic') {
        if (isCoder) return 5;
        if (isInstruct) return 8;
        return 8;
    }

    if (useCase === 'general') {
        if (isInstruct) return 8;
        if (isCoder) return 2;
        return 8;
    }

    return 4;
}

function getSourcePreference(model = {}) {
    const text = `${model.name || ''} ${model.source || ''}`.toLowerCase();
    return text.includes('0xsero') ? 12 : 0;
}

function scoreModelCandidate(model = {}, context = {}, primaryName = '') {
    const budgetGB = Math.max(0, getBudgetGB(context));
    const workingSetGB = estimateWorkingSetGB(model);
    const modelSizeB = estimateModelSizeB(model);
    const useCaseAffinity = getUseCaseAffinity(model, context.useCase);
    const sourcePreference = getSourcePreference(model);
    const sizeScore = Math.min(modelSizeB, 72) / 2;
    const pressureRatio = budgetGB > 0 ? workingSetGB / budgetGB : 99;

    let fitScore = 12;
    let fitLabel = 'comfortable';

    if (pressureRatio > 0.95) {
        fitScore = -40;
        fitLabel = 'clear loser on fit';
    } else if (pressureRatio > 0.85) {
        fitScore = -12;
        fitLabel = 'tight';
    } else if (pressureRatio > 0.72) {
        fitScore = -4;
        fitLabel = 'workable with little headroom';
    }

    const score = Number((sizeScore + useCaseAffinity + sourcePreference + fitScore + (model.name === primaryName ? 1.5 : 0)).toFixed(1));

    return {
        ...model,
        estimatedSizeB: modelSizeB,
        estimatedWorkingSetGB: workingSetGB,
        score,
        pressureRatio,
        fitLabel
    };
}

function rankModelCandidates(policy = {}, context = {}, primary = {}) {
    const candidates = dedupeModels([
        primary,
        ...getGuideModelCandidates(policy, context),
        ...getMatchingAlternativeCandidates(policy, context)
    ]);

    return candidates
        .map((model) => scoreModelCandidate(model, context, primary.name))
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

    if (selectedModel.name === primaryModel.name) {
        return 'This model stayed ahead after scoring fit, use-case alignment, and source preference across the compatible shortlist.';
    }

    if (`${selectedModel.name} ${selectedModel.source || ''}`.toLowerCase().includes('0xsero')) {
        return 'A fitting 0xSero build outranked the conservative default once shortlist scoring and source preference were applied.';
    }

    return `This alternative outranked the conservative default for ${selectionContext.useCase || 'the current'} work once shortlist scoring was applied.`;
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

    const primaryModel = pickUseCaseValue(rule.value, context.useCase);
    if (!primaryModel || !primaryModel.name) {
        throw new Error(`Invalid model rule in ${GUIDE_SOURCE}`);
    }

    const rankedCandidates = rankModelCandidates(policy, context, primaryModel);
    if (rankedCandidates.length === 0) {
        throw new Error(`Could not rank model candidates from ${GUIDE_SOURCE}`);
    }

    return {
        selected: rankedCandidates[0],
        primary: primaryModel,
        rankedCandidates
    };
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
    const modelChoice = chooseModel(policy, selectionContext);
    const model = modelChoice.selected;
    const contextWindow = estimateContextWindow(policy, selectionContext);
    const performance = estimatePerformance(hardware, model, contextWindow);
    const links = buildLinks(policy, engine, harness, model);
    const alternatives = modelChoice.rankedCandidates
        .filter((item) => item.name !== model.name)
        .slice(0, 4);
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
        candidates: modelChoice.rankedCandidates,
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
                ? `Picked from a scored Hugging Face shortlist instead of the conservative default; 0xSero gets a preference bonus unless fit or use-case makes it a clear loser.`
                : `Scored against the compatible Hugging Face shortlist and still won on fit, use-case, and source preference.`
        ]
    };
}

module.exports = {
    GUIDE_SOURCE,
    GUIDE_VERSION: loadGuidePolicy().version || 'unknown',
    getGuideStackRecommendation
};
