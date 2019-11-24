// Load tmi to connect to Twitch's Chat IRC
const tmi = require('tmi.js');

// Load config & database
const config = require('./config.json');
const database = require('./database.json');

// Load File System to save database when exiting process
const files = require('fs');

// Create client
const client = new tmi.Client({
    options: {
        debug: true
    },
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

// Connect
client.connect().catch(console.log);

process.on("SIGINT", () => {
    console.log('Calling exit hook');
    client.disconnect().then(unused => {
        files.writeFileSync('./database.json', JSON.stringify(database));
        console.log('Called exit hook');
        process.exit();
    });
});

// Used functions
function onConnectedHandler(address, port) {
    console.log(`Connected to ${address}:${port}`);
}

function onActionHandler(channel, userstate, message, self) {
    if (self || userstate.mod || userstate.badges.broadcaster !== '1')
        return;

    let sanctionCount = database[userstate['user-id']] = database[userstate['user-id']] + 1 || 1;

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
        client.say(channel, `/ban ${userstate.username} 60 La commande /me est interdite sur ce stream.`)
        .then(unused => console.log(`[${channel}] Permanently banned ${userstate.username} for doing /me too many times.`))
        .catch(console.log);
    }
}