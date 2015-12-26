# Steam Card Farm
### Node script that farms cards for you, on multiple accounts!

Steam Card Farm is Node.js script to farms Steam cards for you using multiple accounts at once, it's idea is based on [ArchiSteamFarm](https://github.com/JustArchi/ArchiSteamFarm). The script simulates Steam client, works in the background and is self-sufficient. It's designed to work on every device that is able to run Node.js.

Everything works well thanks to [SteamKit2](https://github.com/SteamRE/SteamKit) node.js port, [node-steam](https://github.com/seishun/node-steam) and awesome modules made by [DoctorMcKay](https://github.com/DoctorMcKay).

## Requirements

Requires Node.js version 4.11 or greater.

## Installation

- Install [Node.js](https://nodejs.org/)
- Clone the repository
- Run `npm install` inside script directory

## Running

Before running the script create configuration file `config/settings.js`, you should use `config/example.js` as reference (read [configuration](#configuration) for details).

Running it is as simple as executing `node main.js`. On unix systems you may use your favourite software to keep it running in background (check [pm2](https://github.com/Unitech/pm2), [nodemon](https://github.com/remy/nodemon), [forever](https://github.com/foreverjs/forever), [screen](http://linux.die.net/man/1/screen) or [nohup](http://linux.die.net/man/1/nohup)).

You should see some information on console screen (depending on log level you chose), all control is done via bot interface (steam message - read [bot commands](#bot-commands)).

## Accounts

Account must be protected by Mobile Authenticator or not protected by SteamGuard at all in order to work with the script. You must supply `shared_secret` from your device if you use Mobile Authenticator ([see how to](http://forums.backpack.tf/index.php?/topic/45995-guide-how-to-get-your-shared-secret-from-ios-device-steam-mobile/)).
You may supply `identity_secret` and enable `confirm_trades` to automate trade system - note that only trade offers from bot admin will be accepted and confirmed, all others will be canceled.

Check [support](#Support) section if you need more help.

## Configuration

### Example configuration with explanation

```js
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
```

- `domain` - String used while requesting new trade API key
- `botAdmins` - An array that contains bot admins' SteamIDs
- `logger` - logger level configuration (check [Winston](https://github.com/winstonjs/winston#logging-levels))
    - `console` - console log level (you may want to use `verbose` or `debug` for more detailed log)
    - `file` - file log level
- `bots` - An array with clients details
    - `enabled` - Determines if the client is used or not
    - `trades` - Optional, default `false`, enables trade module. Trade module makes the client to accept all trades from admins (if you use Mobile Authenticator you'll have to accept the trade manually though)
    - `confirm_trades` - Optional, default `false`, if set to `true` the client will confirm every trade, requires `identity_secret` to be set (currently not supported)
    - `idle` - Optional, default `true`, if disabled the client will not idle any games, but still work as an interface
    - `offline` - Optional, default `false`, if set to `true` the client will not shown as online - great for idling main account
    - `check_on_items` - Optional, default `true`, if set to `false` the client will not check badges page after receiving new items, check every 10 minutes instead.
    - `name` - Optional, custom name for the client in logs, if not set `steamid` will be used
    - `steamid` - The client steamid
    - `username` - The client username
    - `password` - The client password
    - `shared_secret` - Optional, used if 2FA is enabled on the account, ommit if your account doesn't use it (email SteamGuard is not supported at this moment)
    - `identity_secret` - Optional, used for confirming trades if Mobile Authenticator is used on the account (currently not supported)
- `stats` - Optional, default `false`, if set, the bot will join [group chat](http://steamcommunity.com/groups/nscf) as a guest - used for statistics

## Bot commands

There's a few commands you may use to menage your bots. Every bot acts as an interface.

Available commands: !help, !info, !stats, !status, !botidle <appid>, !botstop, !botstart, !botrefresh, !farmidle <appid>, !farmrefresh

- `!help` - Displays available commands
- `!info` - Displays script info
- `!status` - Displays total amount of cards left to idle by bot (alias: `!stats`, `!cards`, `!drop`, `!drops`)
- `!redeem <code>` - Redeem the code on bot's account (alias: `!feed <code>`)
- `!botidle <appid>` - Requests the bot to idle prompt game, there's no checking for cards left (alias: `!idle <appid>`)
- `!farmidle <appid>` - Orders all bots to idle prompt game, only bots which have cards left will respond
- `!botstop` - Stops the bot from idling
- `!botstart` - Run the bot if stopped (alias: `!botrefresh`, `!refresh`)
- `!farmrefresh` - Refresh badges list for all bots
- `!ping` - Responds with 'Pong!'
- `!2fa` - Prints current 2FA codes for all accounts with `shared_secret` filled

## Tested on

- Windows 8.1 Pro N with Node.js 4.2.0
- Debian 8.1 Jessie with Node.js 4.2.1

## Work in progress

The script is still in testing state, there's no guarantee it won't crash because of unknown error, display weired message or cook you a meal - use on your own risk!

There's a couple of TODOs in the code, you may check them for details.

- [x] Add option to redeem cd key on the bot
- [x] Change `!status` command to be more detailed
- [x] Add some delays to prevent getting blocked by anti-DoS
- [x] Add support for trade confirmations
- [x] Add option to idle games in offline mode
- [ ] Disable bot if it's trade blocked - there's no point in farming cards
- [ ] Check for game purchase data to prevent from disabling refund option
- [ ] Check if the bot already owns the game, instead of testing the key on all of them (the function is locked for now)
- [ ] Add support for Steam Mobile Authenticator to accept trades automatically
- [ ] Add support for email Steam Guard

Feel free to inspect the code, bring or implement new ideas or just provide feedback!

## Known bugs

- The client may logout off steamcommunity, so it cannot check for the badges.

## Support

Please use [issues](https://github.com/Aareksio/node-steam-card-farm/issues), [steam group](http://steamcommunity.com/groups/nscf) or just [drop me a comment](http://steamcommunity.com/id/DoctorMole/).

## License

```
The MIT License (MIT)

Copyright (c) 2015 Arkadiusz Sygulski <arkadiusz@sygulski.pl>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```
