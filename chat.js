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

    self.anonymous = false;
    if (self.options.login == null) { // Generate an anonymous twitch login, if not given
        var login = 'justinfan';
        for (var i = 0; i < 5; i++) {
          var num = Math.floor(Math.random() * 10);
          login += num;
        }
        self.options.login = login;
        self.anonymous = true;
    }

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

    // Used to store error listeners
    self.errorListeners = [];

    var loginOptions = {
        port: self.options.ircPort,
        channels: channels
    };
    if (self.options.token) {
        loginOptions.password = 'oauth:' + self.options.token;
    }

    self.irc = new irc.Client(self.options.ircURL, self.options.login, loginOptions);

    // Request all additional information/messages from Twitch
    self.irc.send('CAP REQ', 'twitch.tv/membership');
    self.irc.send('CAP REQ', 'twitch.tv/tags');
    self.irc.send('CAP REQ', 'twitch.tv/commands');

    // Used to store callbacks for when connection was successful
    self.connectedCallbacks = [];

    // Create generic global user
    self.user = {
        login: self.options.login,
        display_name: self.options.login
    };

    self.listenTwitchTag('GLOBALUSERSTATE', function (args, tags) { // Getting this also indicates login was successful
        if (tags['display-name'].length != 0) {
            self.user.display_name = tags['display-name'];
        }
        self.user.id = tags['user-id'];
        self.user.badges = tags['badges'];
        self.user.color = tags['color'];
        self.user.emote_sets = tags['emote-sets'];
        self.user.type = tags['user-type'];

        for (var i in self.connectedCallbacks) {
            self.connectedCallbacks[i](self.user);
        }
    });
    if (self.anonymous) {
        var joined = false;
        self.listenRaw(function (args, tags) { // Listen to any event for joined
            if (!joined) {
              joined = true;
              for (var i in self.connectedCallbacks) {
                  self.connectedCallbacks[i](self.user);
              }
            }
        });
    }

    // Used to store channel states
    self.channels = [];
    // Used to store callbacks for when joining a channel
    self.roomStateCallbacks = [];

    self.listenTwitchTag('ROOMSTATE', function (args, tags) { // Getting this also indicates successful connection to room
        var state = parser.createRoomState(args, tags);
        var firstJoin;
        if (self.channels[state.channel]) { // Already have state, override it
            firstJoin = false;
            for (var i in state){
                self.channels[state.channel][i] = state[i];
            }
        } else {
            firstJoin = true;
            self.channels[state.channel] = state;
        }
        if (self.roomStateCallbacks[state.channel] !== undefined) {
            for (var i in self.roomStateCallbacks[state.channel]) {
                self.roomStateCallbacks[state.channel][i](self.channels[state.channel], firstJoin);
            }
        }
    });
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

TwitchBot.prototype.onConnected = function (callback) {
    this.connectedCallbacks.push(callback);
};

TwitchBot.prototype.isInChannel = function (channel) {
    return this.channels[channel] !== undefined;
};

// Callback is roomState, isFirstJoin
TwitchBot.prototype.joinChannel = function (channel, roomChangeCallback) {
    this.irc.join('#' + channel);
    this.onRoomChange(roomChangeCallback);
};

TwitchBot.prototype.leaveChannel = function (channel) {
    this.irc.part('#' + channel);
    delete this.channels[channel];
    delete this.roomStateCallbacks[channel];
};

// Callback is roomState, isFirstJoin
TwitchBot.prototype.onRoomChange = function (channel, callback) {
    if (typeof channel === 'function') {
        callback = channel;
        this.listenTwitchTag('ROOMSTATE', function (args, tags) {
            var state = parser.createRoomState(args, tags);
            callback(state);
        });
    } else {
        if (this.roomStateCallbacks[channel] == undefined) this.roomStateCallbacks[channel] = [];
        if (callback != null) {
            this.roomStateCallbacks[channel].push(callback);
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
            callback(user, 1, tags['msg-param-sub-plan']);
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
TwitchBot.prototype.listenCommand = function (command, callback, caseSensitive) {
    if (!caseSensitive) command = command.toLowerCase();
    this.listen(function (user) {
        if (!caseSensitive) user.msg = user.msg.toLowerCase();
        if (user.msg.lastIndexOf(command, 0) === 0) { // Starts with command
            callback(user);
        }
    });
};

// Callback is: user
TwitchBot.prototype.listenMsg = function (msg, callback, caseSensitive) {
    if (!caseSensitive) msg = msg.toLowerCase();
    this.listen(function (user) {
        if (!caseSensitive) user.msg = user.msg.toLowerCase();
        if (user.msg.indexOf(msg) !== -1) {
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
