#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const GreenlockExpress = require('greenlock-express')
const nconf = require('nconf');
const yargs = require('yargs')
const camelcase = require('camelcase');
const ini = require('ini');
const DB = require('./services/database');
const { isAlreadyRunning, notifyRunning } = require('./services/is-already-running');
const bannerMessage = require('./services/cli-banner-message');
const app = require('./app');

// get app configuration
const config = nconf
    .argv(yargs
        .usage('Usage: $0 <command> [options]')
        // .example('$0 count -f foo.js', 'count the lines in the given file')
        .command('$0', 'Launch the interactive RPNow CLI', y => y
            .version('2.2-alpha8')
            .alias('v', 'version')
        )
        .command('start', 'Start the RPNow server')
        .command('stop', 'Stop the RPNow server')
        .command('run-attached', 'Run the RPNow process in the current shell')
        .command('admin', 'Administrative functions', y => y
            .demandCommand()
            .command('list', 'List all RPs in the system')
            .command('get-links <id>', 'Show all links that point to some RP')
            .command('add-link <slug> <id>', 'Add a chat-capable link for the RP', y => y
                .option('read')
                .alias('r', 'read')
                .nargs('r', 1)
                .describe('r', 'Make link read-only')
            )
            .command('remove-link <slug>', 'Deactivate a link to some RP (but the RP itself will still exist)')
            .command('destroy <id>', 'Permanently delete an RP (will prompt to confirm)', y => y
                .option('yes')
                .describe('yes', 'Skip prompt to delete RP')
            )
        )
        .help('h')
        .alias('h', 'help')
        .version(false)
        // .epilog('copyright 2015')
    )
    .env({
        transform({ key, value }) {
            if (!/^RPNOW_/.test(key)) return false;
            return {
                key: camelcase(obj.key.substr('RPNOW_'.length)),
                value
            };
        },
        parseValues: true,
    })
    .add('default configFile location', {
        type: 'literal',
        store: {
            configFile: path.join(path.dirname(process.argv[1]), '..', 'rpnow.ini')
        }
    })
    .file('rpnow.ini config file', {
        file: nconf.get('configFile'),
        format: {
            parse: str => {
                const obj = ini.parse(str);
                Object.entries(obj).forEach(([key, value]) => {
                    try { obj[key] = JSON.parse(value) } catch (_) {}
                });
                return obj;
            }
        },
    })
    .defaults({
        dataDir: (process.platform === 'win32' ?
            path.join(process.env.APPDATA, 'rpnow') :
            path.join(os.homedir(), 'rpdata')
        ),
        port: 80,
        ssl: false,
        sslPort: 443,
        sslDomain: '',
        letsencryptAcceptTOS: false,
        letsencryptEmail: '',
        trustProxy: false,
    })
    .get();


//
console.log(config)
console.log(yargs.argv)







process.exit(0)








if(fs.existsSync(config.configFile)) {
    console.log('Loaded config from ' + config.configFile)
} else {
    console.log('No config data found at ' + config.configFile)
}

function showError(str) {
    console.error(str);

    if (process.argv[0].includes('rpnow')) {
        // In desktop app mode, keep the process alive
        console.error('(Press Ctrl+C to exit.)')
        setInterval(() => {}, 10000); 
    } else {
        // In command line mode, exit with error code
        process.exit(1);
    }
}

(async function main() {
    // create data directory if it doesnt exist
    if (!fs.existsSync(config.dataDir)) fs.mkdirSync(config.dataDir);

    // initialize db
    await DB.open(config.dataDir);

    // check if the server is already running (or ports are used)
    if (await isAlreadyRunning(config.dataDir)) {
        return showError('ERROR: RPNow is already running');
    }

    // write lastport.lock
    notifyRunning(config.dataDir, config.sslPort || config.port)

    // enable trustProxy?
    if (config.trustProxy === true) app.enable('trust proxy');

    // start server
    if (config.ssl === true) {
        // ensure we agreed to the letsencrypt TOS
        if (config.letsencryptAcceptTOS !== true) return showError("ERROR: You must accept the Let's Encrypt TOS to use this service.");

        const letsencryptDir = path.join(config.dataDir, 'letsencrypt');
        if (!fs.existsSync(letsencryptDir)) fs.mkdirSync(letsencryptDir);

        const server = GreenlockExpress.create({
            app,

            email: config.letsencryptEmail,
            agreeTos: config.letsencryptAcceptTOS === true,
            approvedDomains: [config.sslDomain],
            configDir: letsencryptDir,

            communityMember: false,
            securityUpdates: false,
            telemetry: true,
        });
        server.listen(config.port, config.httpsPort, (err) => {
            if (err) return showError(`ERROR: RPNow failed to start: ${err}`);

            // delay logging this until messages generated by vue-pronto are done
            setTimeout(() => console.log(bannerMessage(config)), 2000);
        });
    } else {
        app.listen(config.port, (err) => {
            if (err) return showError(`ERROR: RPNow failed to start: ${err}`);

            // delay logging this until messages generated by vue-pronto are done
            setTimeout(() => console.log(bannerMessage(config)), 2000);
        });
    }
}());
