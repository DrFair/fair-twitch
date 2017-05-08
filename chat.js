var irc = require('irc');
var parser = require('./parser');

exports.TwitchBot = TwitchBot;

function TwitchBot(options, channels) {
    var self = this;

    self.options = {
        ircURL: 'irc.chat.twitch.tv',
        ircPort: 6667,
        login: null,
        token: null
    };

    self.setOptions(options);

    // Manage channels parameter
    if (channels == null) channels = [];

    if (typeof(channels) == 'string') {
        channels = [channels];
    }
    for (let i = 0; i < channels.length; i++) {
        if (channels[i].charAt(0) !== '#') {
            channels[i] = '#' + channels[i];
        }
    }
    
    self.errorListeners = [];

    self.channels = channels;

    self.irc = new irc.Client(self.options.ircURL, self.options.login, {
        port: self.options.ircPort,
        password: 'oauth:' + self.options.token,
        channels: self.channels
    });

    // Request all additional information/messages from Twitch
    self.irc.send('CAP REQ', 'twitch.tv/membership');
    self.irc.send('CAP REQ', 'twitch.tv/tags');
    self.irc.send('CAP REQ', 'twitch.tv/commands');
}

TwitchBot.prototype.setOptions = function (options) {
    for (var i in options){
        if (this.options[i] !== undefined){ // Only override if the passed in value is actually defined
            this.options[i] = options[i];
        }
    }
};

// Callback: err
TwitchBot.prototype.onError = function (callback) {
    this.irc.addListener('error', function (err) {
        // Twitch can't handle WHOIS requests, but there's no way to disable those in node-irc
        if (err['rawCommand'] === '421' && err['args'] && err['args'][1] === 'WHOIS') {
            return;
        }
        callback(err);
    });
    this.errorListeners.push(callback);
};

function submitError(errorListeners, error) {
    for (var i = 0; i < errorListeners.length; i++) {
        errorListeners[i](error);
    }
}

TwitchBot.prototype.isInChannel = function (channel) {
    if (!channel.charAt(0) !== '#') channel = '#' + channel;
    for (var i = 0; i < this.channels.length; i++) {
        if (this.channels[i] === channel) return true;
    }
    return false;
};

TwitchBot.prototype.joinChannel = function (channel) {
    if (!channel.charAt(0) !== '#') channel = '#' + channel;
    if (!this.isInChannel(channel)) {
        this.irc.join(channel);
        this.channels.push(channel);
    }
};

TwitchBot.prototype.leaveChannel = function (channel) {
    if (!channel.charAt(0) !== '#') channel = '#' + channel;
    for (var i = 0; i < this.channels.length; i++) {
        if (this.channels[i] === channel) {
            this.irc.part(channel);
            this.channels.splice(i, 1);
            return;
        }
    }
};

// Callback is: error, args, tags
TwitchBot.prototype.listenRaw = function (callback) {
    this.irc.addListener('raw', function (msg) {
        if (msg.commandType === 'normal') {
            if (msg.command.charAt(0) === '@') {
                msg.command = msg.command.substring(1);
            }
            var s = msg.command.split(';');
            var tags = {};
            for (var i = 0; i < s.length; i++) {
                var split = s[i].split('=');
                tags[split[0]] = split[1];
            }
            callback(msg.args, tags);
        }
    });
};

// Callback is: args, tags
TwitchBot.prototype.listenTwitchTag = function (twitchTag, callback) {
    this.listenRaw(function (args, tags) {
        if (err) return;
        if (args) {
            var argsSplit = args[0].split(' ');
            if (argsSplit.length > 1 && argsSplit[1] === twitchTag) {
                callback(args, tags);
            }
        }
    });
};

// Callback is user, months, subTier (subTier is from twitch, can either be Prime, 1000, 2000 or 3000)
TwitchBot.prototype.listenSubs = function (callback) {
    this.listenTwitchTag('USERNOTICE', function (args, tags) {
        var user = parser.createUser(args, tags);
        if (tags['msg-id'] == 'sub') {
            callback(user, 0, tags['msg-param-sub-plan']);
        } else if (tags['msg-id'] == 'resub') {
            callback(user, Number(tags['msg-param-months']), tags['msg-param-sub-plan']);
        }
    });
};

// Callback is: user
TwitchBot.prototype.listen = function (callback) {
    this.listenTwitchTag('PRIVMSG', function (args, tags) {
        var user = parser.createUser(args, tags);
        callback(user);
    });
};

// Callback is: user
TwitchBot.prototype.listenCommand = function (command, callback) {
    this.listen(function (user) {
        if (user.msg.lastIndexOf(command.toLowerCase(), 0) === 0) { // Starts with command
            callback(user);
        }
    });
};

// Callback is: user
TwitchBot.prototype.listenMsg = function (msg, callback) {
    this.listen(function (user) {
        if (user.msg.toLowerCase().indexOf(msg.toLowerCase()) !== -1) {
            callback(user);
        }
    });
};

// Callback is: user
TwitchBot.prototype.listenWhisper = function (callback) {
    this.listenTwitchTag('WHISPER', function (args, tags) {
        var user = parser.createUser(args, tags);
        callback(user);
    });
};

TwitchBot.prototype.msg = function (channel, message) {
    if (!channel.charAt(0) !== '#') channel = '#' + channel;
    this.irc.send('PRIVMSG ' + channel, message)
};

// For some reason, whispering does not work atm, use msg with /w
// User has to be username of receiver
TwitchBot.prototype.whisper = function (user, message) {
    if (typeof(user) !== 'string') {
        if (user.login) user = user.login;
        else user = user.display_name; // Sometimes, all Twitch sends is the display name
        if (typeof(user) !== 'string') {
            submitError(this.errorListeners, 'Invalid user to whisper to');
            return;
        }
    }
    if (this.channels.length <= 0) {
        submitError(this.errorListeners, 'Cannot whisper when not joined a channel');
        return;
    }
    this.msg(this.channels[0], '/w ' + user + ' ' + message);
};