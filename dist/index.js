#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const { execSync } = require("child_process");
const inquirer = require("inquirer").default;
const API_URL = 'https://api.design.vp0.com';
const CONFIG_FILE = "vp0.json";
function getConfig() {
    const configPath = path.join(process.cwd(), CONFIG_FILE);
    if (!fs.existsSync(configPath)) {
        return null;
    }
    return JSON.parse(fs.readFileSync(configPath, "utf-8"));
}
const program = new commander_1.Command();
program
    .name('vp0')
    .description('VP0 - React Native Component Marketplace CLI')
    .version('0.1.0');
program
    .command('init')
    .description('Initialize a new VP0 project')
    .action(async () => {
    const existing = getConfig();
    if (existing) {
        const { overwrite } = await inquirer.prompt({
            type: "confirm",
            name: "overwrite",
            message: "A vp0.json already exists. Do you want to overwrite it?",
            default: false,
        });
        if (!overwrite) {
            console.log("Cancelled.");
            return;
        }
    }
    const answers = await inquirer.prompt([
        {
            type: "input",
            name: "ui",
            message: "Where do you want UI components?",
            default: "./components/ui",
        },
        {
            type: "input",
            name: "hooks",
            message: "Where do you want hooks?",
            default: "./hooks",
        },
        {
            type: "input",
            name: "lib",
            message: "Where do you want lib utilities?",
            default: "./lib",
        },
        {
            type: "input",
            name: "blocks",
            message: "Where do you want blocks?",
            default: "./components/blocks",
        },
    ]);
    const config = {
        paths: {
            ui: answers.ui,
            hooks: answers.hooks,
            lib: answers.lib,
            blocks: answers.blocks,
        },
    };
    fs.writeFileSync(path.join(process.cwd(), CONFIG_FILE), JSON.stringify(config, null, 2));
    console.log("✅ Created vp0.json");
});
program
    .command('add <component>')
    .description('Install a component into your project')
    .action(async (component) => {
    // Check config exists
    const config = getConfig();
    if (!config) {
        console.error('❌ No vp0.json found. Run "vp0 init" first.');
        process.exit(1);
    }
    const cleaned = component.replace("@", "");
    const [username, slug] = cleaned.split("/");
    if (!username || !slug) {
        console.error("❌ Invalid format. Use: vp0 add @username/component-name");
        process.exit(1);
    }
    console.log(`Fetching ${component}...`);
    try {
        const response = await fetch(`${API_URL}/r/${username}/${slug}`);
        if (!response.ok) {
            console.error(`❌ Component not found: ${component}`);
            process.exit(1);
        }
        const data = await response.json();
        if (data.type === "demo") {
            console.error("❌ Demos cannot be installed. Install the parent component instead.");
            process.exit(1);
        }
        console.log(`✅ Found: ${data.name} (v${data.version})`);
        const registry = data.registry || "ui";
        const savePath = config.paths[registry] || config.paths.ui;
        const saveDir = path.join(process.cwd(), savePath);
        if (!fs.existsSync(saveDir)) {
            fs.mkdirSync(saveDir, { recursive: true });
        }
        const fileName = slug
            .split("-")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join("") + ".tsx";
        const filePath = path.join(saveDir, fileName);
        if (fs.existsSync(filePath)) {
            const { overwrite } = await inquirer.prompt({
                type: "confirm",
                name: "overwrite",
                message: `${fileName} already exists. Do you want to overwrite it?`,
                default: false,
            });
            if (!overwrite) {
                console.log("Cancelled.");
                return;
            }
        }
        fs.writeFileSync(filePath, data.code);
        console.log(`📄 Saved: ${savePath}/${fileName}`);
        const deps = Object.entries(data.dependencies || {});
        if (deps.length > 0) {
            const depString = deps
                .map(([name, version]) => `${name}@${version}`)
                .join(' ');
            console.log('📦 Installing dependencies...');
            try {
                execSync(`npm install ${depString}`, { stdio: "inherit" });
            }
            catch (error) {
                console.error("⚠️  Failed to install deps. Run manually:");
                console.error(`   npm install ${depString}`);
            }
        }
        console.log(`\n✅ Done! ${data.name} is ready to use.`);
    }
    catch (error) {
        console.error(`❌ Failed to connect to API`);
        process.exit(1);
    }
});
program.parse();
