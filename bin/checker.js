#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const HardwareDetector = require('../src/hardware/detector');
const { getGuideStackRecommendation } = require('../src/guide/stack-recommender');

const INSTALL_MD_PATH = path.join(process.cwd(), 'install.md');

function parseArgs(argv = []) {
    const options = {
        verbose: true,
        simulate: null,
        gpu: null,
        ram: null,
        cpu: null,
        vram: null,
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
    console.log('\n' + chalk.bgGreen.black.bold(' GUIDE-DRIVEN STACK '));
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
    console.log(chalk.green('│') + ` Endpoint: ${chalk.yellow(recommendation.endpoint)}`);
    console.log(chalk.green('│') + ` Serve: ${chalk.gray(recommendation.commands.serve)}`);
    console.log(chalk.green('│') + ` Attach: ${chalk.gray(recommendation.commands.attach)}`);

    if (Array.isArray(recommendation.alternatives) && recommendation.alternatives.length > 0) {
        console.log(chalk.green('│') + ` HF Alts: ${chalk.gray(recommendation.alternatives.slice(0, 2).map((item) => item.name).join(' | '))}`);
    }

    recommendation.rationale.slice(0, 2).forEach((line) => {
        console.log(chalk.green('│') + ` Why: ${chalk.gray(line)}`);
    });
    recommendation.notes.slice(0, 2).forEach((line) => {
        console.log(chalk.green('│') + ` Note: ${chalk.gray(line)}`);
    });
    console.log(chalk.green('╰'));
}

function writeInstallMarkdown(recommendations = []) {
    const content = recommendations.map((recommendation) => {
        const alternatives = recommendation.alternatives || [];
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
            alternatives.length > 0 ? 'Alternatives:' : '',
            ...alternatives.slice(0, 3).map((item) => `- ${item.name} (${item.format}, ${item.source})`)
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
    const recommendations = ['agentic', 'coding', 'general'].map((useCase) =>
        getGuideStackRecommendation(hardware, { useCase })
    );

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
