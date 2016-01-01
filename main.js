/* Get settings from the file */
var settings = {};
try {
    settings = require('./config/settings.js');
} catch (err) {
    console.error('No settings file! (./config/settings.js)');
    console.error('Read more: https://github.com/Aareksio/node-steam-card-farm#configuration');
    process.exit(1);
}

/* Set up logging */
var Winston = require('winston');
var logger = new (Winston.Logger)({
    transports: [
        new (Winston.transports.Console)({
            colorize: true,
            level: settings.logger.console
        }),
        new (Winston.transports.File)({
            level: settings.logger.file,
            timestamp: true,
            filename: 'error.log',
            json: false
        })
    ]
});

/* Load steam modules */
var SteamUser = require('steam-user');
var SteamTotp = require('steam-totp');
var SteamCommunity = require('steamcommunity');
var TradeOfferManager = require('steam-tradeoffer-manager');

/* Check server time offset */
var serverOffset = 0;
SteamTotp.getTimeOffset(function(offset, latency) {
    latenncy = Math.floor(latency / 1000);
    if (latency > 1) {
        logger.warn('High server latency detected!');
        serverOffset = offset + Math.floor(latency / 2);
    } else {
        serverOffset = offset;
    }
});

/* Load file stream module to process poll data */
var fs = require('fs');

/* Load request and cheerio to parse steam badges page */
var Cheerio = require('cheerio');

/* Read bots list */
var bots = {};
settings.bots.forEach(function(bot) {
    /* Make sure bot object is defined properly and it's active */
    if (bot.enabled && typeof bot.steamid === 'string' && typeof bot.username === 'string' && typeof bot.password === 'string') {
        /* Add bot to local list */
        bots[bot.steamid] = {
            name: bot.name || bot.steamid,
            username: bot.username,
            password: bot.password,
            shared_secret: bot.shared_secret,
            identity_secret: bot.identity_secret,
            confirm_trades: bot.confirm_trades || false,
            idle: bot.idle || true,
            check_on_items: bot.check_on_items !== false,
            bot: new SteamUser({
                'promptSteamGuardCode': false
            }),
            community: new SteamCommunity(),
            offers: (!bot.trades ? null : new TradeOfferManager({
                steam: this.bot,
                domain: settings.domain,
                language: 'en',
                pollInterval: 20000,
                cancelTime: 450000
            })),
            active: false,
            idling: null,
            apps: {},
            offline: bot.offline || false,
            debug: bot.debug || false
        };
    }
});

/* Bot functions */
function botRedeemKey(botid, key, callback) {
    bots[botid].bot.redeemKey(key, function(result, details, apps) {
        if (details === SteamUser.EPurchaseResult.OK) {
            setTimeout(function() {
                updateGames(botid);
            }, (Math.random() * 10).toFixed(3) * 1000);
            return callback(null, botid, apps);
        }

        return callback(details, botid);
    });
}

function farmRedeemKey(key, callback) {
    /* Highly ineffective, disabled for now */
    /* [TODO: Check if the bot already owns the game instead of blind testing] */
    var bot_ids = Object.keys(bots);

    var code_callback = function(err, botid, apps) {
        if (err) {
            switch (err) {
                case SteamUser.EPurchaseResult.InvalidKey:
                case SteamUser.EPurchaseResult.DuplicatedKey:
                case SteamUser.EPurchaseResult.RegionLockedKey:
                    if (typeof callback === 'function') {
                        return callback(err);
                    }
                    break;
                case SteamUser.EPurchaseResult.AlreadyOwned:
                case SteamUser.EPurchaseResult.BaseGameRequired:
                case SteamUser.EPurchaseResult.OnCooldown:
                    bot_ids.splice(bot_ids.indexOf(botid), 1);
                    if (bot_ids.length > 0) {
                        botRedeemKey(bot_ids[0], key, code_callback);
                    } else {
                        if (typeof callback === 'function') {
                            if (err === SteamUser.EPurchaseResult.OnCooldown) {
                                return callback(null, 'Key activation on cooldown or/and already owned by all bots!');
                            } else {
                                return callback(null, 'Already owned by all bots!');
                            }
                        }
                    }
                    break;
            }
        } else {
            logger.info('[' + bots[botid].name + '] Activated new key! New packets: ' + Object.keys(apps).map(function(index) {
                     return apps[index];
                 }).join(', '));
            if (typeof callback === 'function') {
                return callback(null, botid, apps);
            }
        }
    };

    botRedeemKey(bot_ids[0], key, code_callback);
}

function idleGame(botid, gameid) {
    /* Check if bot is excluded from idling */
    if (bots[botid].idle) {
        /* Check if gameid is number or not */
        if (!isNaN(parseInt(gameid, 10))) {
            gameid = parseInt(gameid, 10);
        }

        if(gameid === 0) { // Something went wrong...
            logger.debug('[' + bots[botid].name + '] Requested to idle game id 0, trashing!');
            return;
        }

        bots[botid].bot.gamesPlayed(gameid);
        bots[botid].idling = gameid;
        logger.info('[' + bots[botid].name + '] Started idling: ' + gameid);
    }
}

function stopIdle(botid) {
    bots[botid].bot.gamesPlayed();
    bots[botid].idling = null;
    logger.verbose('[' + bots[botid].name + '] Stopped idling');
}

function processMessage(botid, senderid, message) {
    /* Check if message sender is one of bot admins */
    if (settings.botAdmins.indexOf(senderid.getSteamID64()) > -1) {
        logger.verbose('[' + bots[botid].name + '] Received message from bot admin: ' + message);
        if (message.substr(0, 1) === '!') {
            var command = message.split(' ')[0].substring(1).toLowerCase();
            switch (command) {
                case 'help':
                    bots[botid].bot.chatMessage(senderid, 'Available commands: !help, !info, !cards, !idle <appid>, !farmidle <appid>, !botstop, !refresh, !farmrefresh, !redeem <code>');
                    bots[botid].bot.chatMessage(senderid, 'Check details here: https://github.com/Aareksio/node-steam-card-farm');
                    break;
                case 'info':
                    bots[botid].bot.chatMessage(senderid, 'Steam Cards Farm v0.1.3 (2015-12-25)');
                    bots[botid].bot.chatMessage(senderid, 'Report bugs here: https://github.com/Aareksio/node-steam-card-farm/issues');
                    break;
                case 'status':
                case 'stats':
                case 'drops':
                case 'drop':
                case 'cards':
                    var cards = 0;
                    Object.keys(bots).forEach(function(id) {
                        if (bots.hasOwnProperty(id)) {
                            var bot_cards = Object.keys(bots[id].apps).map(function(index) {
                                return parseInt(bots[id].apps[index].drops, 10);
                            });
                            if (bot_cards.length > 0) {
                                bot_cards = bot_cards.reduce(function(a, b) {
                                    return a + b;
                                });
                            } else {
                                bot_cards = 0;
                            }
                            cards += bot_cards;
                            bots[botid].bot.chatMessage(senderid, '[' + bots[id].name + '] ' + bot_cards + ' card' + (bot_cards === 1 ? '' : 's') + ' left (' + Object.keys(bots[id].apps).length + ' game' + (Object.keys(bots[id].apps).length === 1 ? '' : 's') + ')' + (bots[id].idling ? ', currently idling: ' + bots[id].idling : '') + '!');
                        }
                    });
                    bots[botid].bot.chatMessage(senderid, cards + ' left to idle on ' + Object.keys(bots).length + ' client' + (Object.keys(bots).length === 1 ? '' : 's') + '!');
                    break;
                case 'botidle':
                case 'idle':
                    var game = message.split(' ')[1];
                    idleGame(botid, game);
                    bots[botid].bot.chatMessage(senderid, 'Started idling ' + game);
                    break;
                case 'farmidle':
                    var all_game = message.split(' ')[1];
                    farmIdle(all_game);
                    bots[botid].bot.chatMessage(senderid, 'All bots with the game started idling: ' + all_game);
                    break;
                case 'botstop':
                    stopIdle(botid, game);
                    bots[botid].bot.chatMessage(senderid, 'Stopped idling');
                    break;
                case 'botstart':
                case 'botrefresh':
                case 'refresh':
                    bots[botid].bot.chatMessage(senderid, 'Refreshing the bot!');
                    updateGames(botid, function(err) {
                        if (err) {
                            bots[botid].bot.chatMessage(senderid, 'Error! ' + err);
                        } else {
                            bots[botid].bot.chatMessage(senderid, 'Done!');
                        }
                    });
                    break;
                case 'farmrefresh':
                    bots[botid].bot.chatMessage(senderid, 'Refreshing all bots!');
                    Object.keys(bots).forEach(function(id) {
                        if (bots.hasOwnProperty(id)) {
                            setTimeout(function() {
                                updateGames(id, function(err) {
                                    if (err) {
                                        bots[id].bot.chatMessage(senderid, 'Error! ' + err);
                                    }
                                });
                            }, (Math.random() * 10 + 5).toFixed(3) * 1000);
                        }
                    });
                    break;
                case 'redeem':
                case 'feed':
                    var code = message.split(' ')[1];
                    botRedeemKey(botid, code, function(err, botid, apps) {
                        if (err) {
                            bots[botid].bot.chatMessage(senderid, 'Couldn\'t activate the code, error code: ' + err);
                        } else {
                            bots[botid].bot.chatMessage(senderid, 'Redeemed code! New packets: ' + Object.keys(apps).map(function(index) {
                                    return apps[index];
                                }).join(', ') + '!');
                        }
                    });
                    break;
                case 'ping':
                    bots[botid].bot.chatMessage(senderid, 'Pong!');
                    break;
                case '2fa':
                    Object.keys(bots).forEach(function(id) {
                        if (bots.hasOwnProperty(id) && bots[id].shared_secret) {
                            bots[botid].bot.chatMessage(senderid, '[' + bots[id].name + '] Code: ' + SteamTotp.getAuthCode(bots[id].shared_secret, serverOffset));
                        }
                    });
                    break;
                case 'confirm':
                    if (bots[botid].confirm_trades && bots[botid].identity_secret) {
                        bots[botid].bot.chatMessage(senderid, 'Confirming trades...');
                        confirmTrades(botid);
                    } else {
                        bots[botid].bot.chatMessage(senderid, 'Account is not allowed to confirm any trades, change settings file!');
                    }
                    break;
                case 'debug':
                    var subcommand = message.split(' ')[1];
                    if (subcommand === 'on') {
                        bots[botid].debug = true;
                        bots[botid].bot.chatMessage(senderid, 'Switching on the debug!');
                    } else if (subcommand === 'off') {
                        bots[botid].debug = false;
                        bots[botid].bot.chatMessage(senderid, 'Switching off the debug!');
                    } else {
                        bots[botid].bot.chatMessage(senderid, 'Debug is ' + (bots[botid].debug ? 'on' : 'off') + ', current game: ' + bots[botid].idling);
                    }
                    break;
                default:
                    bots[botid].bot.chatMessage(senderid, 'Unknown command, try: !help');
            }
        }
    } else {
        logger.verbose('[' + bots[botid].name + '] Received unauthorized message: ' + message);
    }
}

function loadBadges(botid, page, apps, callback, retry) {
    apps = apps || {};
    page = page || 1;
    retry = retry || 0;

    logger.debug('[' + bots[botid].name + '] Checking badges page ' + page + '...');

    /* Use steamcommunity module to access badges page */
    bots[botid].community.request('https://steamcommunity.com/my/badges/?p=' + page, function(err, response, body) {
        /* Check for invalid response */
        if (err || response.statusCode !== 200) {
            if (retry < 5) {
                logger.warn('[' + bots[botid].name + '] Error updating badges page: ' + (err || 'HTTP' + response.statusCode) + ', retrying...');
                setTimeout(function() {
                    loadBadges(botid, page, apps, callback, retry + 1);
                }, (Math.random() * 10 + 5).toFixed(3) * 1000); // Give it time...
            } else {
                logger.warn('[' + bots[botid].name + '] Error updating badges page: ' + (err || 'HTTP' + response.statusCode) + ', aborting!');
            }
            if (typeof callback === 'function') {
                return callback((err || 'HTTP' + response.statusCode));
            } else {
                return;
            }
        }

        /* Do some parse magic */
        var $ = Cheerio.load(body);

        if ($('#loginForm').length) {
            logger.warn('[' + bots[botid].name + '] Cannot load badges page - not logged in! Requesting new session...');
            return bots[botid].bot.webLogOn();
        }

        logger.debug('[' + bots[botid].name + '] Badges page ' + page + ' loaded...');

        $('.badge_row').each(function () { // For each badge...
            var row = $(this);

            var overlay = row.find('.badge_row_overlay'); // Get it's inner content...
            if (!overlay) { // Well done!
                return;
            }

            var match = overlay.attr('href').match(/\/gamecards\/(\d+)/); // Get game appid...
            if (!match) { // Well done!
                return;
            }

            var appid = parseInt(match[1], 10);

            /* [TODO: Check when the packet was bought and don't idle it without permission] */

            var name = row.find('.badge_title');
            name.find('.badge_view_details').remove();
            name = name.text().replace(/\n/g, '').replace(/\r/g, '').replace(/\t/g, '').trim();

            var drops = row.find('.progress_info_bold').text().match(/(\d+) card drops? remaining/);
            if (!drops) { // Nothing to do here!
                return;
            }

            drops = parseInt(drops[1], 10);
            if (isNaN(drops) || drops === 0) { // Well done!
                logger.debug(appid + ': Can\'t parse cards!');
                return;
            }

            var playtime = row.find('.badge_title_stats').html().match(/(\d+\.\d+) hrs on record/);
            if (!playtime) {
                playtime = 0.0;
            } else {
                playtime = parseFloat(playtime[1], 10);
                if (isNaN(playtime)) { // Well done!
                    playtime = 0.0;
                }
            }

            apps[appid] = {
                name: name,
                drops: drops,
                playtime: playtime
            }
        });

        var pagelinks = $('.pageLinks').first();
        if (pagelinks.html() === null) {
            return callback(null, apps);
        }

        pagelinks.find('.pagebtn').each(function() {
            var button = $(this);
            if (button.text() === '>') {
                if (button.hasClass('disabled')) {
                    return callback(null, apps);
                } else {
                    return loadBadges(botid, page + 1, apps, callback);
                }
            }
        });
    });
}

function updateGames(botid, callback) {
    if (!bots[botid].community.steamID) {
        if (typeof callback === 'function') {
            return callback('Not logged in!');
        }
        return;
    }

    var apps = {};

    loadBadges(botid, 1, apps, function(err, apps) {
        /* Save the data */
        bots[botid].apps = apps;

        if (err) {
            return; // Handled already
        }

        /* Check if there's any game to idle */
        if (Object.keys(apps).length > 0) {
            /* Check if the bot is not idling the game already */
            if (!bots[botid].idling || !apps.hasOwnProperty(bots[botid].idling)) {
                /* Get first element on the list and idle the game */
                /* [TODO: Add different algorithms] */
                logger.verbose('[' + bots[botid].name + '] Game changed!');
                idleGame(botid, Object.keys(apps)[0]);
            } else {
                logger.verbose('[' + bots[botid].name + '] Game not changed!');
            }
        } else {
            /* Stop idling if no cards left */
            logger.info('[' + bots[botid].name + '] No games to idle!');
            if (bots[botid].idling) {
                stopIdle(botid);
                logger.debug('[' + bots[botid].name + '] Stopping idle, no games left.');
            }
        }

        if (typeof callback === 'function') {
            return callback(null);
        }
    });
}

function farmIdle(gameid) {
    Object.keys(bots).forEach(function(botid) {
        if (bots.hasOwnProperty(botid)) {
            if (Object.keys(bots[botid].apps).indexOf(gameid) > -1) {
                idleGame(botid, gameid);
            }
        }
    });
}

function confirmTrades(botid, retry) {
    retry = retry || 0;
    logger.debug('[' + bots[botid].name + '] Checking for trade offers to confirm!');

    bots[botid].community.getConfirmations(SteamTotp.time(serverOffset), SteamTotp.getConfirmationKey(bots[botid].identity_secret, SteamTotp.time(serverOffset), 'conf'), function(err, confirmations) {
        if (err) {
            if (retry < 5) {
                logger.warn('[' + bots[botid].name + '] Cannot check trade confirmations: ' + err + ', retrying...');
                confirmTrades(botid, retry + 1);
            } else {
                logger.warn('[' + bots[botid].name + '] Cannot check trade confirmations: ' + err + ', aborting...');
            }
            return;
        }

        var failed = false;

        confirmations.forEach(function(confirmation) {
            logger.verbose('[' + bots[botid].name + '] Attempting to accept confirmation #' + confirmation.id + '!');
            confirmation.respond(SteamTotp.time(serverOffset), SteamTotp.getConfirmationKey(bots[botid].identity_secret, SteamTotp.time(serverOffset), 'allow'), true, function(err) {
                if (err) {
                    logger.warn('[' + bots[botid].name + '] Error accepting confirmation #' + confirmation.id + ': ' + err + '...');
                } else {
                    logger.info('[' + bots[botid].name + '] Confirmation #' + confirmation.id + ' accepted!');
                }
            })
        });

        if (failed) {
            if (retry < 5) {
                logger.warn('[' + bots[botid].name + '] Error accepting confirmations, retrying...');
                confirmTrades(botid, retry + 1);
            } else {
                logger.warn('[' + bots[botid].name + '] Error accepting confirmations 5 times in a row, aborting...');
            }
        }
    });
}

/* Initialize bots */

Object.keys(bots).forEach(function(botid) {
    if (bots.hasOwnProperty(botid)) {
        /* Login to steam */
        logger.info('[' + bots[botid].name + '] Logging in...');

        bots[botid].bot.logOn({
            accountName: bots[botid].username,
            password: bots[botid].password,
            twoFactorCode: (bots[botid].shared_secret ? SteamTotp.getAuthCode(bots[botid].shared_secret, serverOffset) : null)
        });

        bots[botid].bot.on('loggedOn', function(details) {
            logger.info('[' + bots[botid].name + '] Logged into Steam!');
            if (!bots[botid].offline) {
                bots[botid].bot.setPersona(SteamUser.Steam.EPersonaState.Online);
            }
            bots[botid].idling = null;
        });

        bots[botid].bot.on('disconnected', function(details) {
            logger.info('[' + bots[botid].name + '] Disconnected from Steam! Reason: ' + details);
            bots[botid].active = false;
        });

        /* Handle errors */
        bots[botid].bot.on('error', function(e) {
            /* [TODO: Handle errors] */
            logger.error('[' + bots[botid].name + '] ' + e);
        });

        bots[botid].bot.on('steamGuard', function(domain, callback, lastCodeWrong) {
            if (lastCodeWrong) {
                logger.warn('[' + bots[botid].name + '] SteamGuard code invalid - make sure server time is correct and you supply `shared_secret` in config!');
            } else {
                logger.warn('[' + bots[botid].name + '] SteamGuard required - use Mobile authenticator or disable SteamGuard!');
            }
        });

        /* Get web session */
        bots[botid].bot.on('webSession', function (sessionID, cookies) {
            logger.verbose('[' + bots[botid].name + '] Got new web session');

            /* Initialize steamcommunity module by setting cookies */
            bots[botid].community.setCookies(cookies);

            /* Do the same with trade module */
            if (bots[botid].offers !== null) {
                bots[botid].offers.setCookies(cookies, function (err){
                    if (!err) {
                        logger.verbose('[' + bots[botid].name + '] Trade offer cookies set. API key: '+ bots[botid].offers.apiKey);
                    } else {
                        logger.error('[' + bots[botid].name + '] Unable to set trade offer cookies: ' + err);
                    }
                });
            }

            bots[botid].active = true;
            setTimeout(function() {
                logger.debug('[' + bots[botid].name + '] Checking badges (new web session)!');
                updateGames(botid); // Start idle
            }, (Math.random() * 10 + 5).toFixed(3) * 1000); // 'Still cooking', give it time...

            if (settings.stats) {
                bots[botid].bot.joinChat('103582791440699799');
            }
        });

        /* Check for limitations */
        /* [TODO: Disable bot if trade is impossible] */
        bots[botid].bot.on('accountLimitations', function (limited, communityBanned, locked, canInviteFriends) {
            if (limited) { logger.warn('[' + bots[botid].name + '] Account limited!'); }
            if (communityBanned){ logger.warn('[' + bots[botid].name + '] Account banned from Steam Community!'); }
            if (locked){ logger.error('[' + bots[botid].name + '] Account locked! Can\'t trade!'); }
            if (!canInviteFriends){ logger.warn('[' + bots[botid].name + '] Account can not add any friends!'); }
        });

        bots[botid].bot.on('friendMessage', function(senderID, message) {
            processMessage(botid, senderID, message);
        });

        if (bots[botid].check_on_items) {
            bots[botid].bot.on('newItems', function(count) {
                /* Check for any card drops left */
                setTimeout(function() {
                    logger.debug('[' + bots[botid].name + '] Checking badges (new items)!');
                    updateGames(botid);
                }, (Math.random() * 10 + 5).toFixed(3) * 1000); // Give it time, this event may be emitted right after logging in - it takes time for steam to create web session...
            });
        } else {
            /* Check every interval (9:30 - 10:30 min) */
            setInterval(function() {
                logger.debug('[' + bots[botid].name + '] Checking badges (interval)!');
                updateGames(botid);
            }, (Math.random() * 60 + 570).toFixed(3) * 1000);

        }

        if (bots[botid].offers !== null) {
            fs.readFile('polldata/' + botid + '.json', function (err, data) {
                if (err) {
                    logger.verbose('[' + bots[botid].name + '] No polldata/' + botid + '.json found.');
                } else {
                    logger.debug('[' + bots[botid].name + '] Found previous pool data.');
                    bots[botid].offers.pollData = JSON.parse(data);
                }
            });

            /* Process trade offers sent by bot admin */
            bots[botid].offers.on('newOffer', function (offer) {
                logger.info('[' + bots[botid].name + '] New offer #' + offer.id + ' from ' + offer.partner.getSteamID64());
                if (settings.botAdmins.indexOf(offer.partner.getSteamID64()) !== -1) {
                    logger.info('[' + bots[botid].name + '] Admin ('+ offer.partner.getSteamID64() +') offered a trade. Attempting to accept.');
                    offer.accept(function (err) {
                        if (err) {
                            logger.warn('[' + bots[botid].name + '] Unable to accept offer #'+ offer.id +': ' + err.message);
                        } else {
                            logger.verbose('[' + bots[botid].name + '] Offer #' + offer.id + ' accepted!');

                            /* Confirm the trade */
                            if (bots[botid].confirm_trades && bots[botid].identity_secret) {
                                confirmTrades(botid);
                            }
                        }
                    });
                } else {
                    logger.verbose('[' + bots[botid].name + '] User ' + offer.partner.getSteamID64() + ' offered an invalid trade. Declining.');
                    offer.decline(function (err) {
                        if (err) {
                            logger.warn('[' + bots[botid].name + '] Unable to decline offer #' + offer.id + ': ' + err.message);
                        } else {
                            logger.verbose('[' + bots[botid].name + '] Offer #' + offer.id + ' declined!');
                        }
                    });
                }
            });

            /* Display changes in offers */
            bots[botid].offers.on('receivedOfferChanged', function (offer, oldState) {
                logger.verbose('[' + bots[botid].name + '] ' + offer.partner.getSteam3RenderedID() +' offer #' + offer.id + ' changed: ' + TradeOfferManager.getStateName(oldState) + ' -> ' + TradeOfferManager.getStateName(offer.state));
            });

            bots[botid].offers.on('sentOfferChanged', function (offer, oldState) {
                logger.verbose('[' + bots[botid].name + '] ' + offer.partner.getSteam3RenderedID() +' offer #' + offer.id + ' changed: ' + TradeOfferManager.getStateName(oldState) + ' -> ' + TradeOfferManager.getStateName(offer.state));
            });

            /* Save poll data for future use */
            bots[botid].offers.on('pollFailure', function (err) {
                logger.warn('[' + bots[botid].name + '] Poll data ' + err);
            });

            bots[botid].offers.on('pollData', function (pollData) {
                fs.writeFile('polldata/' + botid + '.json', JSON.stringify(pollData));
            });
        }
    }
});
