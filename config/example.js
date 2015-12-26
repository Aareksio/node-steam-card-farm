module.exports = {
    /* Domain, used for generating trade keys if needed */
    domain: 'my.domain',

    /* Bot admin(s) */
    botAdmins: [
        '76561198042302314'
    ],

    /* Log levels */
    logger: {
        console: 'debug',
        file: 'error'
    },

    /* Bots */
    bots: [
        {
            enabled: false,
            trades: true,
            confirm_trades: false,
            idle: true,
            offline: true,
            check_on_items: true,
            name: 'Bot',
            steamid: '76561198xxxxxxxxx',
            username: 'xxxxxxxx',
            password: 'xxxxxxxx',
            shared_secret: 'xxxxxxxxxxxxxxxxxxxxxxxxxxx=',
            identity_secret:'xxxxxxxxxxxxxxxxxxxxxxxxxxx='
        }
    ],

    /* Statistics */
    stats: true
};
