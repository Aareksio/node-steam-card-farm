module.exports = {
    /* Domain, used for generating trade keys if needed */
    domain: 'my-domain.me',

    /* Bot admin(s) */
    botAdmins: [
        '76561198042302314'
    ],

    /* Log levels */
    logger: {
        console: 'info',
        file: 'error'
    },

    /* Bots */
    bots: [
        {
            enabled: true,
            trades: true,
            idle: false,
            name: 'Main',
            steamid: '76561198042302314',
            username: 'mainUsername',
            password: 'mainPassword',
            shared_secret: 'sharedSecret'
        },
        {
            enabled: false,
            name: 'Bot #1',
            steamid: '76561198042XXXXXX',
            username: 'bot#1Username',
            password: 'bot#1Password'
        }
    ],

    /* Statistics */
    stats: true
};