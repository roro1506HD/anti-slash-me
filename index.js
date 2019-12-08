// Load tmi to connect to Twitch's Chat IRC
const tmi = require('tmi.js');

// Load config & database
const config = require('./config.json');
const database = require('./database.json');

// Load File System to save database when exiting process
const files = require('fs');

// Load readline to listen for console commands
const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '>'
});

// Create client
const client = new tmi.Client({
    connection: {
        secure: true,
        reconnect: true
    },
    identity: {
        username: config.username,
        password: config.password
    },
    channels: config.channels
});

// Register listeners
client.on('connected', onConnectedHandler);
client.on('action', onActionHandler);

readline.on('line', onLineHandler);
readline.on('close', () => process.emit('SIGINT'));

process.on('SIGINT', () => {
    console.log('Calling exit hook');
    client.disconnect().then(unused => {
        files.writeFileSync('./database.json', JSON.stringify(database));
        console.log('Called exit hook');
        process.exit();
    });
});

// Connect
client.connect().catch(console.log);
readline.prompt();

// Used functions
function onConnectedHandler(address, port) {
    console.log(`Connected to ${address}:${port}`);
}

function onActionHandler(channel, userstate, message, self) {
    if (self || userstate.mod || (userstate.badges !== undefined && userstate.badges.broadcaster === '1'))
        return;

    if (userstate['display-name'] === 'roro1506HD') {
        client.say(channel, 'Détection de /me de mon maître... Je ne sais que faire... NotLikeThis');
        return;
    }

    database[channel] = database[channel] || {};

    let sanctionCount = database[channel][userstate['user-id']] = database[channel][userstate['user-id']] + 1 || 1;

    if (sanctionCount === 1) {
        client.say(channel, `/delete ${userstate.id}`)
        .then(unused => console.log(`[${channel}] Deleted message of ${userstate.username} for doing /me for the 1st time.`))
        .catch(console.log);
    } else if (sanctionCount === 2) {
        client.say(channel, `/timeout ${userstate.username} 60 La commande /me est interdite sur ce stream. (2ème avertissement)`)
        .then(unused => console.log(`[${channel}] Timed out ${userstate.username} for 1 minute for doing /me for the 2nd time.`))
        .catch(console.log);
    } else if (sanctionCount === 3) {
        client.say(channel, `/timeout ${userstate.username} 600 La commande /me est interdite sur ce stream. (3ème avertissement)`)
        .then(unused => console.log(`[${channel}] Timed out ${userstate.username} for 10 minutes for doing /me for the 3rd time.`))
        .catch(console.log);
    } else if (sanctionCount === 4) {
        client.say(channel, `/timeout ${userstate.username} 1800 La commande /me est interdite sur ce stream. (Dernier avertissement)`)
        .then(unused => console.log(`[${channel}] Timed out ${userstate.username} for 30 minutes for doing /me for the 4th time.`))
        .catch(console.log);
    } else {
        client.say(channel, `/ban ${userstate.username} La commande /me est interdite sur ce stream.`)
        .then(unused => console.log(`[${channel}] Permanently banned ${userstate.username} for doing /me too many times.`))
        .catch(console.log);
    }
}

function onLineHandler(line) {
    line = line.trim();

    if (line.length === 0) {
        readline.prompt();
        return;
    }

    let args = line.split(' ');
    let command = args[0].toLowerCase();

    args.splice(0, 1);

    handleCommand(command, args);

    readline.prompt();
}

function handleCommand(command, args) {
    if (command === 'send') {
        if (args.length < 2) {
            console.log('You must provide an username and a message to send!');
            return;
        }

        let username = args[0].toLowerCase();

        args.splice(0, 1);

        let message = args.join(' ');

        console.log(`Sending message to '${username}': ${message}`);
        client.say(`#${username}`, message);
    }
}