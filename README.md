# Steam Card Farm
### Node script that farms cards for you, on multiple accounts!

Steam Card Farm is Node.js script that farms cards for you using multiple accounts at once based on [ArchiSteamFarm](https://github.com/JustArchi/ArchiSteamFarm) by @JustArchi. The script simulates Steam client, works in the background and is self-sufficient. It's designed to work on every device that is able to run Node.js. Everything works thanks to [SteamKit2](https://github.com/SteamRE/SteamKit) node.js port, [node-steam](https://github.com/seishun/node-steam) by @seishun, awesome modules by @DoctorMcKay.

## Requirements

Requires Node.js version 4.11 or greater.

## Installation

- Install [Node.js](https://nodejs.org/)
- Clone the repository
- Run `npm install` inside script directory

## Configuration

Before running the script create configuration file `config/settings.js`, you should use `config/example.js` as reference.

```js
module.exports = {
    domain: 'my-domain.me',
    botAdmins: [
        '76561198042302314'
    ],
    logger: {
        console: 'info',
        file: 'error'
    },
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
            password: 'bot#2Password'
        }
    ],
    stats: true
};
```

- `domain` - This string is used while requesting new trade API key
- `botAdmins` - An array with bot admins
- `logger` - logger level configuration ([Winston](https://github.com/winstonjs/winston#logging-levels))
    - `console` - console log level, you may like to use `verbose` to get more information there
    - `file` - file log level
- `bots` - An array with you bots details
    - `enabled` - Determines if bot is used or not
    - `trades` - Optional, default `false`, use to enable trade module. If enabled bot accepts all trades from admins
    - `idle` - Optional, default `true`, if set to false the bot will not idle any games, but still work as interface
    - `steamid` - The bot steamid
    - `username` - The bot username
    - `password` - The bot password
    - `shared_secret` - Used if 2FA is enabled on the account, ommit if your account doesn't use it. If not supplied you'll be prompt to enter 2FA every time you run the script.
- `stats` - If `true`, the bot will join [group chat](http://steamcommunity.com/groups/nscf) as a guest

## Bot commands

There's a few commands you may use to menage your bots. Every bot acts as an interface.

Available commands: !help, !info, !stats, !status, !botidle <appid>, !botstop, !botstart, !botrefresh, !farmidle <appid>, !farmrefresh

- `!help` - Displays available command
- `!info` - Displays script info
- `!stats` - Displays total amount of games left to idle by bot
- `!status` - The same as `!stats`, but displays only current bot data
- `!botidle <appid>` - Requests the bot to idle prompt game, there's no checking for cards left
- `!botstop` - Stops the bot from idling
- `!botstart` - Run the bot if stopped
- `!botrefresh` - Refresh badges list
- `!farmidle <appid>` - Orders all bots to idle prompt game, only bots which have cards left will respond
- `!farmrefresh` - Refresh badges list for all bots

## Tested on

- Windows 8.1 Proffesional with Node.js 4.2.0
- Debian 8.1 Jessie with Node.js 4.2.1

## Work in progress

There's a couple of TODOs in the code, you may check them for details.

- Implement game code redeem function - waiting for DoctorMcKay/node-steam-user#36
- Disable bot if it's trade blocked - there's no point in farmin cards then
- Check for game purchase data to prevent from disabling refund option
- Check if the bot already owns the game, instead of testing the key on all of them
- Support for Steam Mobile Authenticator to omit trade escrow

## Support

For everything script related please use [issues](https://github.com/Aareksio/node-steam-card-farm/issues) or [steam group](http://steamcommunity.com/groups/nscf).

## License

MIT