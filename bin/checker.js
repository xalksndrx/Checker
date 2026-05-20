#!/usr/bin/env node
const fs = require('fs');
const https = require('https');
const path = require('path');
const chalk = require('chalk');
const HardwareDetector = require('../src/hardware/detector');
const {
    buildRecommendationContext,
    getGuideStackRecommendation,
    rankExplicitModelCandidates
} = require('../src/guide/stack-recommender');

const INSTALL_MD_PATH = path.join(process.cwd(), 'install.md');
const DEFAULT_TOP_N = 5;
const HF_DISCOVERY_LIMIT = 100;
const HF_DISCOVERY_MAX_CANDIDATES = 600;
const HF_DISCOVERY_METADATA_LIMIT = 160;
const HF_DISCOVERY_SEARCH_CONCURRENCY = 3;
const HF_DISCOVERY_METADATA_CONCURRENCY = 4;
const modelMetadataCache = new Map();
const modelSearchCache = new Map();

function parseArgs(argv = []) {
    const options = {
        verbose: true,
        simulate: null,
        gpu: null,
        ram: null,
        cpu: null,
        vram: null,
        useCase: 'general',
        topN: DEFAULT_TOP_N,
        models: [],
        help: false,
        version: false
    };

    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        const next = argv[index + 1];

        if (arg === '--help' || arg === '-h') {
            options.help = true;
            continue;
        }
        if (arg === '--version' || arg === '-V') {
            options.version = true;
            continue;
        }
        if (arg === '--no-verbose') {
            options.verbose = false;
            continue;
        }
        if (arg === '--simulate' && next) {
            options.simulate = next;
            index += 1;
            continue;
        }
        if (arg === '--gpu' && next) {
            options.gpu = next;
            index += 1;
            continue;
        }
        if (arg === '--ram' && next) {
            options.ram = next;
            index += 1;
            continue;
        }
        if (arg === '--cpu' && next) {
            options.cpu = next;
            index += 1;
            continue;
        }
        if (arg === '--vram' && next) {
            options.vram = next;
            index += 1;
            continue;
        }
        if ((arg === '--use-case' || arg === '--usecase') && next) {
            options.useCase = next;
            index += 1;
            continue;
        }
        if (arg === '--top' && next) {
            const parsed = Number(next);
            if (Number.isFinite(parsed) && parsed > 0) {
                options.topN = Math.max(1, Math.min(10, Math.round(parsed)));
            }
            index += 1;
            continue;
        }
        if ((arg === '--model' || arg === '--models') && next) {
            next.split(',').map((item) => item.trim()).filter(Boolean).forEach((item) => options.models.push(item));
            index += 1;
            continue;
        }
    }

    return options;
}

function showHelp() {
    console.log(`Usage: node bin/checker.js [options]

Runs the full local LLM stack analysis and recommendation flow.

Options:
  --simulate <profile>   Simulate a saved hardware profile
  --gpu <model>          Simulate a custom GPU
  --ram <gb>             Simulate RAM in GB
  --cpu <model>          Simulate a custom CPU
  --vram <gb>            Override GPU VRAM in GB
  --use-case <name>      Evaluate for general, coding, or agentic
  --top <n>              Show top ranked choices (default: 5, max: 10)
  --model <id-or-url>    Evaluate an explicit model candidate (repeatable)
  --models <list>        Comma-separated explicit model IDs or HF URLs
  --no-verbose           Disable step-by-step progress
  -h, --help             Show this help
  -V, --version          Show package version
`);
}

function showVersion() {
    const pkg = require('../package.json');
    console.log(pkg.version);
}

function getHardwareTierForDisplay(hardware = {}) {
    const rawTier = hardware.summary?.hardwareTier || 'unknown';
    if (rawTier !== 'unknown') {
        return String(rawTier).replace(/_/g, ' ').toUpperCase();
    }

    const ram = Number(hardware.memory?.total || 0);
    const vram = Number(hardware.gpu?.vram || 0);
    if (ram >= 64 || vram >= 24) return 'HIGH';
    if (ram >= 24 || vram >= 12) return 'MEDIUM';
    if (ram >= 12) return 'LOW';
    return 'ENTRY';
}

function getBackendLabelForDisplay(hardware = {}) {
    const summary = hardware.summary || {};
    if (summary.bestBackendLabel) return summary.bestBackendLabel;
    return String(summary.backendName || summary.bestBackend || hardware.gpu?.backend || 'cpu').toUpperCase();
}

function formatGpuInventoryList(gpus = []) {
    if (!Array.isArray(gpus) || gpus.length === 0) return 'None';
    return gpus
        .map((gpu) => {
            if (!gpu?.name) return null;
            return gpu.count > 1 ? `${gpu.name} x${gpu.count}` : gpu.name;
        })
        .filter(Boolean)
        .join(', ') || 'None';
}

function formatCandidateHeadline(candidate = {}) {
    const activeText = Number.isFinite(candidate.estimatedActiveSizeB) && candidate.estimatedActiveSizeB > 0
        ? ` | active ~${candidate.estimatedActiveSizeB}B`
        : '';
    const labelText = candidate.runLabel ? ` | ${candidate.runLabel}` : '';
    return `${candidate.format} | est ~${candidate.estimatedSizeB}B quality class${activeText} | working set ~${candidate.estimatedWorkingSetGB}GB | fit ${candidate.fitLabel}${labelText} | score ${candidate.score}`;
}

function displaySystemInfo(hardware = {}) {
    const cpu = hardware.cpu || {};
    const memory = hardware.memory || {};
    const gpu = hardware.gpu || {};

    console.log('\n' + chalk.bgBlue.white.bold(' SYSTEM INFORMATION '));
    console.log(chalk.blue('╭' + '─'.repeat(50)));
    console.log(chalk.blue('│') + ` CPU: ${chalk.white(`${cpu.brand} (${cpu.cores} cores, ${cpu.speed}GHz)`)}`);
    console.log(chalk.blue('│') + ` Architecture: ${chalk.white(cpu.architecture || 'Unknown')}`);
    console.log(chalk.blue('│') + ` RAM: ${chalk.white(`${memory.total}GB`)}`);
    console.log(chalk.blue('│') + ` GPU: ${chalk.white(gpu.model || 'Unknown')}`);
    console.log(chalk.blue('│') + ` Backend: ${chalk.white(getBackendLabelForDisplay(hardware))}`);
    console.log(chalk.blue('│') + ` VRAM: ${chalk.white(`${gpu.vram || 'N/A'}GB`)}${gpu.dedicated ? chalk.green(' (Dedicated)') : chalk.yellow(' (Integrated)')}`);
    console.log(chalk.blue('│') + ` Dedicated GPUs: ${chalk.green(formatGpuInventoryList(hardware.summary?.dedicatedGpuModels))}`);
    console.log(chalk.blue('│') + ` Integrated GPUs: ${chalk.yellow(formatGpuInventoryList(hardware.summary?.integratedGpuModels))}`);
    console.log(chalk.blue('│') + ` Hardware Tier: ${chalk.white(getHardwareTierForDisplay(hardware))}`);
    console.log(chalk.blue('╰'));
}

function displayRecommendation(recommendation) {
    console.log('\n' + chalk.bgGreen.black.bold(' MODEL RECOMMENDATION '));
    console.log(chalk.green('╭' + '─'.repeat(78)));
    console.log(chalk.green('│') + ` Use case: ${chalk.cyan.bold(recommendation.useCase)}`);
    console.log(chalk.green('│') + ` Engine: ${chalk.white.bold(recommendation.engine.label)} ${chalk.gray(`via ${recommendation.engine.controlPlane}`)}`);
    console.log(chalk.green('│') + ` Harness: ${chalk.white.bold(recommendation.harness.name)}`);
    console.log(chalk.green('│') + ` Model: ${chalk.white.bold(recommendation.model.name)}`);
    console.log(chalk.green('│') + ` Format: ${chalk.cyan(recommendation.model.format)} ${chalk.gray(`| Source: ${recommendation.model.source}`)}`);
    console.log(
        chalk.green('│') +
        ` Perf: ~${chalk.white.bold(recommendation.performance.tokensPerSecond + ' tok/s')} ${chalk.gray(`| first token ~${recommendation.performance.firstTokenSeconds}s | context ~${recommendation.performance.contextWindow}`)}`
    );
    console.log(chalk.green('│') + ` Cloud Ref: ${chalk.cyan(recommendation.frontierComparison.closest)} ${chalk.gray(`| frontier leader: ${recommendation.frontierComparison.leader}`)}`);
    console.log(chalk.green('│') + ` Endpoint: ${chalk.yellow(recommendation.endpoint)}`);
    console.log(chalk.green('│') + ` Serve: ${chalk.gray(recommendation.commands.serve)}`);
    console.log(chalk.green('│') + ` Attach: ${chalk.gray(recommendation.commands.attach)}`);

    recommendation.rationale.slice(0, 3).forEach((line) => {
        console.log(chalk.green('│') + ` Why: ${chalk.gray(line)}`);
    });
    [recommendation.frontierComparison.summary, ...recommendation.notes].slice(0, 2).forEach((line) => {
        console.log(chalk.green('│') + ` Note: ${chalk.gray(line)}`);
    });
    (recommendation.topChoices || []).slice(0, 5).forEach((candidate, index) => {
        console.log(chalk.green('│') + ` Top ${index + 1}: ${chalk.white(candidate.name)}`);
        console.log(chalk.green('│') + `        ${chalk.gray(formatCandidateHeadline(candidate))}`);
        console.log(
            chalk.green('│') +
            `        ${chalk.gray(`~${candidate.performance.tokensPerSecond} tok/s | first token ~${candidate.performance.firstTokenSeconds}s | context ~${candidate.contextWindow} | ${candidate.tradeoff}`)}`
        );
        if (candidate.runLabelReason) {
            console.log(chalk.green('│') + `        ${chalk.gray(`Label: ${candidate.runLabel} | ${candidate.runLabelReason}`)}`);
        }
    });
    if ((recommendation.uncensoredChoices || []).length > 0) {
        (recommendation.uncensoredChoices || []).slice(0, 5).forEach((candidate, index) => {
            console.log(chalk.green('│') + ` Uncensored ${index + 1}: ${chalk.white(candidate.name)}`);
            console.log(chalk.green('│') + `        ${chalk.gray(formatCandidateHeadline(candidate))}`);
        });
    }
    console.log(chalk.green('╰'));
}

function displayModelComparison(result) {
    console.log('\n' + chalk.bgMagenta.white.bold(' MODEL COMPARISON '));
    console.log(chalk.magenta('╭' + '─'.repeat(78)));
    console.log(chalk.magenta('│') + ` Use case: ${chalk.cyan.bold(result.useCase)}`);
    console.log(chalk.magenta('│') + ` Engine lane: ${chalk.white.bold(result.engine.label)} ${chalk.gray(`via ${result.engine.controlPlane}`)}`);
    console.log(chalk.magenta('│') + ` Harness lane: ${chalk.white.bold(result.harness.name)}`);
    console.log(chalk.magenta('│') + ` Suggested context: ${chalk.white(`~${result.contextWindow} tokens`)}`);
    if (result.selected) {
        console.log(chalk.magenta('│') + ` Best choice: ${chalk.white.bold(result.selected.name)}`);
        console.log(chalk.magenta('│') + ` Why: ${chalk.gray(`${result.selected.format} | score ${result.selected.score} | fit ${result.selected.fitLabel} | ${result.selected.runLabel || 'unlabeled'} | context ~${result.selected.contextWindow}`)}`);
    }
    result.rankedCandidates.forEach((candidate, index) => {
        console.log(chalk.magenta('│') + ` ${index + 1}. ${chalk.white(candidate.name)}`);
        console.log(chalk.magenta('│') + `    ${chalk.gray(formatCandidateHeadline(candidate))}`);
        console.log(chalk.magenta('│') + `    ${chalk.gray(`~${candidate.performance.tokensPerSecond} tok/s | first token ~${candidate.performance.firstTokenSeconds}s | context ~${candidate.contextWindow} | ${candidate.tradeoff}`)}`);
        if (candidate.runLabelReason) {
            console.log(chalk.magenta('│') + `    ${chalk.gray(`Label: ${candidate.runLabel} | ${candidate.runLabelReason}`)}`);
        }
        if (Array.isArray(candidate.cautionFlags) && candidate.cautionFlags.length > 0) {
            console.log(chalk.magenta('│') + `    ${chalk.yellow(`Flags: ${candidate.cautionFlags.join(', ')}`)}`);
        }
    });
    console.log(chalk.magenta('╰'));
}

function writeInstallMarkdown(recommendations = []) {
    const content = recommendations.map((recommendation) => {
        const topChoices = recommendation.topChoices || [];
        const uncensoredChoices = recommendation.uncensoredChoices || [];
        return [
            `## ${recommendation.useCase}`,
            '',
            `Engine: ${recommendation.engine.label}`,
            `Harness: ${recommendation.harness.name}`,
            `Model: ${recommendation.model.name}`,
            `Format: ${recommendation.model.format}`,
            `Estimated throughput: ~${recommendation.performance.tokensPerSecond} tok/s`,
            `Estimated first token: ~${recommendation.performance.firstTokenSeconds} s`,
            `Suggested context: ~${recommendation.performance.contextWindow} tokens`,
            `Cloud reference: ${recommendation.frontierComparison.closest}`,
            `Frontier leader: ${recommendation.frontierComparison.leader}`,
            '',
            'Links:',
            `- Engine: ${recommendation.links.engine || 'N/A'}`,
            `- Harness: ${recommendation.links.harness || 'N/A'}`,
            `- Model: ${recommendation.links.model || 'N/A'}`,
            '',
            'Commands:',
            '```bash',
            recommendation.commands.install,
            recommendation.commands.fetch,
            recommendation.commands.serve,
            `# ${recommendation.commands.attach}`,
            '```',
            '',
            'Why this pick:',
            ...recommendation.rationale.slice(0, 4).map((line) => `- ${line}`),
            '',
            'Comparison note:',
            `- ${recommendation.frontierComparison.summary}`,
            `- ${recommendation.frontierComparison.inference}`,
            '',
            topChoices.length > 0 ? 'Top choices:' : '',
            ...topChoices.slice(0, 5).map((item, index) =>
                `- ${index + 1}. ${item.name} (${item.format}, ${item.runLabel || 'unlabeled'}, score ${item.score}, fit ${item.fitLabel}, ~${item.performance.tokensPerSecond} tok/s, context ~${item.contextWindow})`
            ),
            '',
            topChoices.length > 0 ? 'Tradeoffs:' : '',
            ...topChoices.slice(0, 5).map((item) => `- ${item.name}: ${item.tradeoff}`),
            '',
            topChoices.length > 0 ? 'Run labels:' : '',
            ...topChoices.slice(0, 5).map((item) => `- ${item.name}: ${item.runLabel || 'unlabeled'}${item.runLabelReason ? ` - ${item.runLabelReason}` : ''}`),
            '',
            uncensoredChoices.length > 0 ? 'Best uncensored / abliterated / heretic choices:' : '',
            ...uncensoredChoices.slice(0, 5).map((item, index) =>
                `- ${index + 1}. ${item.name} (${item.format}, ${item.runLabel || 'unlabeled'}, score ${item.score}, fit ${item.fitLabel}, ~${item.performance.tokensPerSecond} tok/s, context ~${item.contextWindow})`
            )
        ].filter(Boolean).join('\n');
    }).join('\n\n');

    fs.writeFileSync(INSTALL_MD_PATH, `${content}\n`, 'utf8');
}

function applySimulation(checker, options = {}) {
    const hasCustomHardware = options.gpu || options.ram || options.cpu || options.vram;
    if (!options.simulate && !hasCustomHardware) return false;

    const {
        buildFullHardwareObject,
        buildCustomHardwareObject,
        buildSimulatedHardwareObject,
        getProfile,
        listProfiles
    } = require('../src/hardware/profiles');

    if (options.simulate === 'list') {
        console.log(chalk.cyan.bold('\nAvailable Hardware Profiles:\n'));
        listProfiles().forEach((line) => console.log(line));
        console.log('');
        process.exit(0);
    }

    let hardware;
    let label;

    if (options.simulate) {
        const profile = getProfile(options.simulate);
        if (!profile) {
            console.error(chalk.red(`Unknown profile: ${options.simulate}`));
            listProfiles().forEach((line) => console.log(line));
            process.exit(1);
        }

        hardware = buildSimulatedHardwareObject(options.simulate, {
            gpu: options.gpu || null,
            ram: options.ram ? parseInt(options.ram, 10) : undefined,
            cpu: options.cpu || null,
            vram: options.vram ? parseInt(options.vram, 10) : undefined
        });
        label = hardware._displayName || profile.displayName;
    } else if (hasCustomHardware) {
        hardware = buildCustomHardwareObject({
            gpu: options.gpu || null,
            ram: options.ram ? parseInt(options.ram, 10) : undefined,
            cpu: options.cpu || null,
            vram: options.vram ? parseInt(options.vram, 10) : undefined
        });
        label = hardware._displayName;
    } else {
        hardware = buildFullHardwareObject(options.simulate);
        label = hardware?._displayName || options.simulate;
    }

    checker.setSimulatedHardware(hardware);
    console.log(chalk.magenta.bold(`\nSIMULATION MODE: ${label}\n`));
    return true;
}

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        const headers = {
            'User-Agent': 'llm-checker'
        };
        const token = process.env.HF_TOKEN || process.env.HUGGINGFACE_TOKEN;
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        const request = https.get(url, {
            headers
        }, (response) => {
            let body = '';
            response.setEncoding('utf8');
            response.on('data', (chunk) => { body += chunk; });
            response.on('end', () => {
                if (response.statusCode !== 200) {
                    const error = new Error(`HTTP ${response.statusCode} for ${url}${body ? `: ${body.slice(0, 240)}` : ''}`);
                    error.statusCode = response.statusCode;
                    reject(error);
                    return;
                }

                try {
                    resolve(JSON.parse(body));
                } catch (error) {
                    reject(error);
                }
            });
            if (response.statusCode !== 200) {
                response.resume();
            }
        });

        request.on('error', reject);
    });
}

async function mapWithConcurrency(items = [], limit = 4, worker = async (item) => item) {
    const results = new Array(items.length);
    let nextIndex = 0;

    async function runNext() {
        while (nextIndex < items.length) {
            const currentIndex = nextIndex;
            nextIndex += 1;
            results[currentIndex] = await worker(items[currentIndex], currentIndex);
        }
    }

    const workers = Array.from({ length: Math.min(Math.max(1, limit), items.length) }, runNext);
    await Promise.all(workers);
    return results;
}

function extractModelId(input = '') {
    const text = String(input || '').trim();
    if (!text) return '';
    const prefix = 'https://huggingface.co/';
    if (text.startsWith(prefix)) {
        const parts = text.slice(prefix.length).split(/[?#]/)[0].split('/').filter(Boolean);
        if (parts.length >= 2) return `${parts[0]}/${parts[1]}`;
    }
    return text.replace(/^hf:\/\//i, '').split(/[?#]/)[0];
}

async function fetchModelMetadata(modelInput) {
    const modelId = extractModelId(modelInput);
    if (!modelId || !modelId.includes('/')) {
        return { input: modelInput, metadata: { id: modelId || modelInput } };
    }

    if (modelMetadataCache.has(modelId)) {
        return modelMetadataCache.get(modelId);
    }

    const metadataPromise = fetchJson(`https://huggingface.co/api/models/${modelId}`)
        .then((metadata) => ({ input: modelInput, metadata }))
        .catch((error) => ({ input: modelInput, metadata: { id: modelId, fetchError: error.message } }));

    modelMetadataCache.set(modelId, metadataPromise);
    return metadataPromise;
}

function dedupeFetchedModels(models = []) {
    const seen = new Set();
    const deduped = [];

    models.forEach((item) => {
        const modelId = extractModelId(item?.input || item?.metadata?.id || '');
        if (!modelId || seen.has(modelId)) return;
        seen.add(modelId);
        deduped.push({
            input: modelId,
            metadata: {
                id: modelId,
                ...(item?.metadata || {})
            }
        });
    });

    return deduped;
}

async function searchHuggingFaceModels(params = {}) {
    const query = new URLSearchParams();
    if (params.author) query.set('author', params.author);
    if (params.search) query.set('search', params.search);
    if (params.filter) query.set('filter', params.filter);
    query.set('limit', String(params.limit || 20));
    query.set('sort', params.sort || 'downloads');
    query.set('direction', params.direction || '-1');

    const url = `https://huggingface.co/api/models?${query.toString()}`;
    if (modelSearchCache.has(url)) {
        return modelSearchCache.get(url);
    }

    const searchPromise = fetchJson(url).then((response) => {
        if (!Array.isArray(response)) return [];
        return response.map((item) => ({
            input: item.id,
            metadata: item
        }));
    });
    modelSearchCache.set(url, searchPromise);
    const response = await searchPromise;
    if (!Array.isArray(response)) return [];
    return response;
}

function getDiscoveryTerms(useCase = 'general', options = {}) {
    const terms = [];

    terms.push(
        'uncensored',
        'abliterated',
        'heretic',
        'refusal-removal',
        'instruct',
        'chat',
        'tool calling',
        'function calling',
        'agent'
    );

    if (useCase === 'coding') {
        terms.push('coder', 'coding agent', 'software engineer', 'swe bench', 'code instruct', 'repository');
        return Array.from(new Set(terms));
    }

    if (useCase === 'agentic') {
        terms.push('agentic', 'web search', 'browser use', 'research agent', 'tool use');
        return Array.from(new Set(terms));
    }

    terms.push('reasoning', 'multimodal', 'vision language', 'long context');
    return Array.from(new Set(terms));
}

function buildDiscoveryQueries(useCase = 'general', options = {}) {
    const terms = getDiscoveryTerms(useCase, options);
    const queries = [
        { filter: 'text-generation', sort: 'downloads', limit: HF_DISCOVERY_LIMIT },
        { filter: 'text-generation', sort: 'lastModified', limit: HF_DISCOVERY_LIMIT },
        { filter: 'text-generation', sort: 'likes', limit: HF_DISCOVERY_LIMIT },
        { filter: 'image-text-to-text', sort: 'downloads', limit: HF_DISCOVERY_LIMIT },
        { filter: 'image-text-to-text', sort: 'lastModified', limit: HF_DISCOVERY_LIMIT },
        { filter: 'image-text-to-text', sort: 'likes', limit: HF_DISCOVERY_LIMIT }
    ];

    terms.forEach((search) => {
        queries.push({ search, sort: 'downloads', limit: HF_DISCOVERY_LIMIT });
        queries.push({ search, sort: 'lastModified', limit: HF_DISCOVERY_LIMIT });
    });

    return queries;
}

function getModelAuthor(modelId = '', metadata = {}) {
    const explicitAuthor = String(metadata?.author || '').trim();
    if (explicitAuthor) return explicitAuthor;
    return String(modelId || '').split('/')[0] || '';
}

function normalizeTagList(metadata = {}) {
    return Array.isArray(metadata?.tags)
        ? metadata.tags.map((tag) => String(tag).toLowerCase())
        : [];
}

function modelTextBlob(item = {}) {
    const metadata = item?.metadata || {};
    const modelId = extractModelId(item?.input || metadata?.id || metadata?.modelId || '');
    const author = getModelAuthor(modelId, metadata);
    return [
        modelId,
        author,
        metadata?.pipeline_tag || '',
        ...(Array.isArray(metadata?.tags) ? metadata.tags : [])
    ].join(' ').toLowerCase();
}

function matchesUncensoredFocus(item = {}) {
    const text = modelTextBlob(item);
    return ['uncensored', 'abliterated', 'obliterated', 'heretic', 'refusal-removal']
        .some((term) => text.includes(term));
}

function isTrustedModelAuthor(item = {}) {
    return hasCommunityTraction(item);
}

function hasCommunityTraction(item = {}) {
    const metadata = item?.metadata || {};
    const downloads = Math.max(0, Number(metadata?.downloads || 0));
    const likes = Math.max(0, Number(metadata?.likes || 0));

    if (downloads >= 100 || likes >= 10) return true;
    if (downloads >= 25 && likes >= 2) return true;
    return false;
}

function isRunnableModelRepo(item = {}) {
    const metadata = item?.metadata || {};
    const tags = normalizeTagList(metadata);
    const text = modelTextBlob(item);
    const pipeline = String(metadata?.pipeline_tag || '').toLowerCase();

    if (pipeline === 'text-generation' || pipeline === 'image-text-to-text') return true;

    return (
        tags.includes('text-generation') ||
        tags.includes('image-text-to-text') ||
        tags.includes('conversational') ||
        tags.includes('endpoints_compatible') ||
        tags.includes('gguf') ||
        tags.includes('awq') ||
        tags.includes('gptq') ||
        tags.includes('mlx') ||
        tags.includes('fp8') ||
        tags.includes('nvfp4') ||
        text.includes('gguf') ||
        text.includes('awq') ||
        text.includes('gptq') ||
        text.includes('mlx') ||
        text.includes('fp8') ||
        text.includes('nvfp4')
    );
}

function isAdapterOrCheckpointRepo(item = {}) {
    const metadata = item?.metadata || {};
    const tags = normalizeTagList(metadata);
    const text = modelTextBlob(item);

    const blockedTokens = [
        'adapter',
        'adapters',
        'lora',
        'qlora',
        'peft',
        'checkpoint',
        'debug',
        'generated_from_trainer',
        'grpo',
        'dora',
        'reward-model',
        'reranker',
        'diffusion',
        'embedding',
        'embeddings',
        'text-encoder'
    ];

    return blockedTokens.some((token) => tags.includes(token) || text.includes(token));
}

function matchesDiscoveryUseCase(item = {}, useCase = 'general') {
    const text = modelTextBlob(item);
    const tags = normalizeTagList(item?.metadata || {});
    const isConversational = tags.includes('conversational') || text.includes(' chat') || text.includes('instruct');
    const isCoding = text.includes('coder') || text.includes('codestral') || text.includes('starcoder') || text.includes('devstral') || text.includes('code');

    if (useCase === 'coding') {
        return isCoding || isConversational;
    }

    if (useCase === 'agentic') {
        return isConversational || isCoding || text.includes('agent');
    }

    return isConversational || text.includes('assistant');
}

function shouldKeepDiscoveredModel(item = {}, useCase = 'general', options = {}) {
    const metadata = item?.metadata || {};
    const modelId = extractModelId(item?.input || metadata?.id || metadata?.modelId || '');
    if (!modelId || !modelId.includes('/')) return false;
    if (metadata?.private) return false;
    if (!isRunnableModelRepo(item)) return false;
    if (isAdapterOrCheckpointRepo(item)) return false;
    if (!matchesDiscoveryUseCase(item, useCase)) return false;
    return isTrustedModelAuthor(item) || hasCommunityTraction(item);
}

async function discoverCandidateModels(hardware = {}, options = {}) {
    const context = buildRecommendationContext(hardware, options);
    const searches = buildDiscoveryQueries(context.useCase, options);

    const results = await mapWithConcurrency(
        searches,
        HF_DISCOVERY_SEARCH_CONCURRENCY,
        async (params) => {
            try {
                return { status: 'fulfilled', value: await searchHuggingFaceModels(params) };
            } catch (error) {
                return { status: 'rejected', reason: error };
            }
        }
    );
    const found = results
        .filter((result) => result.status === 'fulfilled')
        .flatMap((result) => result.value)
        .filter((item) => shouldKeepDiscoveredModel(item, context.useCase, options));

    if (found.length === 0) {
        const rateLimited = results.some((result) => result.status === 'rejected' && result.reason?.statusCode === 429);
        if (rateLimited) {
            throw new Error('Hugging Face discovery was rate-limited. Set HF_TOKEN or HUGGINGFACE_TOKEN, then rerun the checker.');
        }
        throw new Error('Hugging Face discovery returned no usable model candidates. Check network access or loosen discovery filters.');
    }

    const deduped = dedupeFetchedModels(found).slice(0, HF_DISCOVERY_MAX_CANDIDATES);
    const enriched = await mapWithConcurrency(
        deduped.slice(0, HF_DISCOVERY_METADATA_LIMIT),
        HF_DISCOVERY_METADATA_CONCURRENCY,
        (item) => fetchModelMetadata(item.input)
    );
    return dedupeFetchedModels([
        ...enriched,
        ...deduped.slice(HF_DISCOVERY_METADATA_LIMIT)
    ]);
}

async function main() {
    const options = parseArgs(process.argv.slice(2));

    if (options.help) {
        showHelp();
        return;
    }

    if (options.version) {
        showVersion();
        return;
    }

    const checker = new HardwareDetector();
    applySimulation(checker, options);

    if (!options.verbose) {
        process.stdout.write(chalk.gray('Generating full recommendation...'));
    }

    const hardware = await checker.getSystemInfo();
    if (options.models.length > 0) {
        const fetchedModels = await Promise.all(options.models.map(fetchModelMetadata));
        const comparison = rankExplicitModelCandidates(hardware, fetchedModels, { useCase: options.useCase, topN: options.topN });
        comparison.rankedCandidates = comparison.rankedCandidates.slice(0, options.topN);
        comparison.selected = comparison.rankedCandidates[0] || comparison.selected;

        if (!options.verbose) {
            console.log(chalk.green(' done'));
        }

        displaySystemInfo(hardware);
        displayModelComparison(comparison);
        return;
    }

    const recommendations = await Promise.all(['agentic', 'coding', 'general'].map(async (useCase) => {
        const discoveredModels = await discoverCandidateModels(hardware, { useCase });
        return getGuideStackRecommendation(hardware, {
            useCase,
            topN: options.topN,
            discoveredModels
        });
    }));

    if (!options.verbose) {
        console.log(chalk.green(' done'));
    }

    displaySystemInfo(hardware);
    recommendations.forEach(displayRecommendation);
    writeInstallMarkdown(recommendations);
    console.log(chalk.gray(`\nWrote agent-ready install plan to ${INSTALL_MD_PATH}`));
}

main().catch((error) => {
    console.error(chalk.red('Error:'), error.message);
    if (process.env.DEBUG) {
        console.error(error.stack);
    }
    process.exit(1);
});
