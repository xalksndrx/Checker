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
const HF_DISCOVERY_FALLBACK = {
    general: [
        '0xSero/Qwen-3.5-28B-A3B-REAP',
        '0xSero/Kimi-K2.5-PRISM-REAP-72',
        'Qwen/Qwen3-14B-AWQ',
        'Qwen/Qwen3.5-32B',
        'google/gemma-4-26b-it',
        'google/gemma-3-27b-it',
        'unsloth/Qwen3.6-35B-A3B-UD-Q6_K_XL',
        'Qwen/Qwen3.5-9B-GGUF'
    ],
    agentic: [
        '0xSero/Qwen-3.5-28B-A3B-REAP',
        '0xSero/Kimi-K2.5-PRISM-REAP-72',
        'Qwen/Qwen3-14B-AWQ',
        'google/gemma-4-26b-it',
        'google/gemma-3-27b-it',
        'unsloth/Qwen3.6-35B-A3B-UD-Q6_K_XL',
        'Qwen/Qwen3.5-9B-GGUF'
    ],
    coding: [
        '0xSero/qwen3-coder-next-64b-REAP',
        'Qwen/Qwen2.5-Coder-14B-Instruct-AWQ',
        'Qwen/Qwen3-Coder-7B',
        'Qwen/Qwen3.5-7B-Instruct',
        'unsloth/Qwen3.6-35B-A3B-UD-Q6_K_XL',
        'google/gemma-4-26b-it',
        'Qwen/Qwen3-Coder-14B-GGUF'
    ]
};

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
            ...topChoices.slice(0, 5).map((item) => `- ${item.name}: ${item.runLabel || 'unlabeled'}${item.runLabelReason ? ` - ${item.runLabelReason}` : ''}`)
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
        const request = https.get(url, {
            headers: {
                'User-Agent': 'llm-checker'
            }
        }, (response) => {
            if (response.statusCode !== 200) {
                response.resume();
                reject(new Error(`HTTP ${response.statusCode} for ${url}`));
                return;
            }

            let body = '';
            response.setEncoding('utf8');
            response.on('data', (chunk) => { body += chunk; });
            response.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (error) {
                    reject(error);
                }
            });
        });

        request.on('error', reject);
    });
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

    try {
        const metadata = await fetchJson(`https://huggingface.co/api/models/${modelId}`);
        return { input: modelInput, metadata };
    } catch (error) {
        return { input: modelInput, metadata: { id: modelId, fetchError: error.message } };
    }
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

function buildDiscoverySearchTerms(useCase = 'general') {
    if (useCase === 'coding') {
        return ['qwen coder', 'deepseek coder', 'codestral', 'starcoder', 'coder'];
    }

    if (useCase === 'agentic') {
        return ['qwen instruct', 'gemma instruct', 'kimi', 'llama instruct', 'moe'];
    }

    return ['qwen instruct', 'gemma instruct', 'kimi', 'llama instruct', 'mistral instruct'];
}

function buildFallbackCandidatePool(useCase = 'general') {
    const models = HF_DISCOVERY_FALLBACK[useCase] || HF_DISCOVERY_FALLBACK.general;
    return models.map((modelId) => ({ input: modelId, metadata: { id: modelId, source: 'fallback-seed' } }));
}

async function searchHuggingFaceModels(params = {}) {
    const query = new URLSearchParams();
    if (params.author) query.set('author', params.author);
    if (params.search) query.set('search', params.search);
    query.set('limit', String(params.limit || 20));
    query.set('sort', 'downloads');
    query.set('direction', '-1');

    const url = `https://huggingface.co/api/models?${query.toString()}`;
    const response = await fetchJson(url);
    if (!Array.isArray(response)) return [];
    return response.map((item) => ({
        input: item.id,
        metadata: item
    }));
}

async function discoverCandidateModels(hardware = {}, useCase = 'general') {
    const context = buildRecommendationContext(hardware, { useCase });
    const searches = [
        { author: '0xSero', limit: 24 },
        ...buildDiscoverySearchTerms(context.useCase).map((search) => ({ search, limit: 18 }))
    ];

    const results = await Promise.allSettled(searches.map((params) => searchHuggingFaceModels(params)));
    const found = results
        .filter((result) => result.status === 'fulfilled')
        .flatMap((result) => result.value);

    if (found.length === 0) {
        return buildFallbackCandidatePool(context.useCase);
    }

    return dedupeFetchedModels([
        ...found,
        ...buildFallbackCandidatePool(context.useCase)
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
        const discoveredModels = await discoverCandidateModels(hardware, useCase);
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
