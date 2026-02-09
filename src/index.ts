import { Command } from "commander";

const API_URL = 'https://api.design.vp0.com'

const program = new Command();

program
    .name('vp0')
    .description('VP0 - React Native Component Marketplace CLI')
    .version('0.1.0');

program
    .command('add <component>')
    .description('Install a component into your project')
    .action(async (component: string) => {
        const cleaned = component.replace('@', '')
        const [username, slug] = cleaned.split('/')

        if (!username || !slug) {
            console.error('❌ Invalid format. Use: vp0 add @username/component-name');
            process.exit(1);
        }

        console.log(`Fetching ${component}...`);

        try {
            const response = await fetch(`${API_URL}/r/${username}/${slug}`)

            if (!response.ok) {
                console.error(`❌ Component not found: ${component}`);
                process.exit(1);
            }

            const data = await response.json()
            console.log(`✅ Found: ${data.name}`);
            console.log(`Version: ${data.version}`);
            console.log(`Dependencies:`, data.dependencies);
            console.log(`Code length: ${data.code.length} characters`);
        } catch (error) {
            console.error(`❌ Failed to connect to API`);
            process.exit(1);
        }
    })

program.parse()