var request = require('request');
var chat = require('./chat');

exports.TwitchClient = TwitchClient;
exports.TwitchBot = chat.TwitchBot;

function TwitchClient(options, channels) {
    var self = this;

    self.userID = null;
    self.login = null;
    
    if (typeof(options) == 'string') {
        options = {
            clientID: options
        }
    }

    self.options = {
        apiURL: 'https://api.twitch.tv/kraken',
        clientID: null,
        secret: null,
        redirect_uri: null,
        login: null,
        token: null
    };

    self.setOptions(options);
    
    if (typeof(self.options.clientID) !== 'string') {
        throw new Error('Invalid clientID');
    }

    // Used to store callbacks of when user id is retrieved
    self.onReadyCallbacks = [];

    self.chat = null;

    if (self.options.token) {
        self.getAuthSummary(function (err, json) {
            if (err) {
                console.log('Error on auth token ' + self.token);
                return;
            }
            if (json.token) {
                self.userID = json.token['user_id'];
                self.options.login = json.token['user_name'];
                self.login = self.options.login;
                self.options.scopes = json.token['authorization']['scopes'];
                self.chat = new chat.TwitchBot(self.options, channels);
                
                for (var i in self.onReadyCallbacks) {
                    self.onReadyCallbacks[i]();
                }
            }
        });
    }
}

TwitchClient.prototype.setOptions = function (options) {
    for (var i in options){
        if (this.options[i] !== undefined){ // Only override if the passed in value is actually defined
            this.options[i] = options[i];
        }
    }
};

// Used to store event triggers for when user id is retrieved
TwitchClient.prototype.onChatReady = function (callback) {
    this.onReadyCallbacks.push(callback);
};

// HTTP Request parts

TwitchClient.prototype.getRequestHeaders = function () {
    return {
        'Accept': 'application/vnd.twitchtv.v5+json',
        'Client-ID': this.options.clientID,
        'Authorization': 'OAuth ' + this.options.token
    };
};

TwitchClient.prototype.rawRequest = function(options, callback) {
    request(options, callback);
};

TwitchClient.prototype.rawPut = function (options, callback) {
    request.put(options, callback);
};

TwitchClient.prototype.rawPost = function (options, callback) {
    request.post(options, callback);
};

TwitchClient.prototype.rawDelete = function (options, callback) {
    request.post(options, callback);
};

// Callback: err, data
TwitchClient.prototype.request = function (apicall, callback, replacementAuth) {
    var options = {
        url: this.options.apiURL + apicall,
        headers: this.getRequestHeaders()
    };
    if (replacementAuth) {
        options.headers['Authorization'] = 'OAuth ' + replacementAuth;
    }
    this.rawRequest(options, function (err, response, body) {
        if (err) {
            callback(err);
            return;
        }
        try { // Sometimes JSON.parse gives token error?
            var json = JSON.parse(body);
            if (json['error']) { // Handles twitch error body
                callback(json['status'] + ' - ' + json['error'] + ': ' + json['message']);
            } else {
                callback(null, json);
            }
        } catch(e) {
            callback(e);
        }
    });
};

// Callback: err, data
TwitchClient.prototype.put = function (apicall, callback) {
    var options = {
        url: this.options.apiURL + apicall,
        headers: this.getRequestHeaders()
    };
    this.rawPut(options, function (err, response, body) {
        if (err) {
            callback(err);
            return;
        }
        try { // Sometimes JSON.parse gives token error?
            var json = JSON.parse(body);
            if (json['error']) { // Handles twitch error body
                callback(json['status'] + ' - ' + json['error'] + ': ' + json['message']);
            } else {
                callback(null, json);
            }
        } catch(e) {
            callback(e);
        }
    });
};

// Callback: err, data
TwitchClient.prototype.post = function (apicall, postData, callback) {
    var options = {
        url: this.options.apiURL + apicall,
        headers: this.getRequestHeaders(),
        formData: postData
    };
    this.rawPost(options, function (err, response, body) {
        if (err) {
            callback(err);
            return;
        }
        try { // Sometimes JSON.parse gives token error?
            var data = JSON.parse(body);
            if (data['error']) { // Handles twitch error body
                callback(data['status'] + ' - ' + data['error'] + ': ' + data['message']);
            } else {
                callback(null, data);
            }
        } catch(e) {
            callback(e);
        }
    });
};

// Callback: err, data
TwitchClient.prototype.delete = function (apicall, postData, callback) {
    var options = {
        url: this.options.apiURL + apicall,
        headers: this.getRequestHeaders()
    };
    this.rawDelete(options, function (err, response, body) {
        if (err) {
            callback(err);
            return;
        }
        try { // Sometimes JSON.parse gives token error?
            var data = JSON.parse(body);
            if (data['error']) { // Handles twitch error body
                callback(data['status'] + ' - ' + data['error'] + ': ' + data['message']);
            } else {
                callback(null, data);
            }
        } catch(e) {
            callback(e);
        }
    });
};

// This requires secret and redirect uri in twitch app
// Callback: err, data
TwitchClient.prototype.getAuthToken = function (code, state, callback) {
    var postData = {
        client_id: this.options.clientID,
        client_secret: this.options.secret,
        grant_type: 'authorization_code',
        redirect_uri: this.options.redirect_uri,
        code: code,
        state: state
    };
    this.post('/oauth2/token', postData, function (err, data) {
        if (err) {
            callback(err);
            return;
        }
        callback(null, data);
    });
};

// Callback: err, data
TwitchClient.prototype.getOtherAuthSummary = function (auth, callback) {
    this.request('/', function (err, data) {
        if (err) {
            callback(err);
            return;
        }
        callback(null, data);
    }, auth);
};

// Callback: err, data
TwitchClient.prototype.getAuthSummary = function (callback) {
    this.request('/', function (err, data) {
        if (err) {
            callback(err);
            return;
        }
        callback(null, data);
    });
};

// Callback: err, data
TwitchClient.prototype.getChannelByID = function (channelID, callback) {
    this.request('/channels/' + channelID, function (err, data) {
        if (err) {
            callback(err);
            return;
        }
        callback(null, data);
    });
};

// Callback: err, channelID
TwitchClient.prototype.getChannelIDByName = function (channelName, callback) {
    this.request('/users?login=' + channelName, function (err, data) {
        if (err) {
            callback(err);
            return;
        }
        if (data.users && data.users[0] != undefined) {
            callback(null, data.users[0]['_id']);
            return;
        }
        callback(null, null);
    });
};

// Callback: err, channel
TwitchClient.prototype.getChannelByName = function (channelName, callback) {
    this.request('/users?login=' + channelName, function (err, data) {
        if (err) {
            callback(err);
            return;
        }
        if (data.users && data.users[0] != undefined) {
            callback(null, data.users[0]);
            return;
        }
        callback('Could not find login by name ' + channelName);
    });
};

// Callback: err, video
TwitchClient.prototype.findVideoByStream = function (stream, callback) {
    this.findVideoByStreamID(stream.channel['_id'], stream['_id'], callback);
};

// Callback: err, video
TwitchClient.prototype.findVideoByStreamID = function (channelID, streamID, callback) {
    var self = this;
    if (channelID == 0) {
        callback('Invalid channel ID: ' + channelID);
        return;
    }

    var limit = 100; // max 100
    var offset = 0;

    request(callback);

    function request(callback) {
        self.request('/channels/' + channelID + '/videos?broadcasts=true&limit=' + limit + '&offset=' + offset, function (err, data) {
            if (err) {
                callback(err);
                return;
            }
            if (data.videos) {
                for (var i = 0; i < data.videos.length; i++) {
                    var video = data.videos[i];
                    if (video.broadcast_type === 'archive') { // Only search for past broadcasts
                        if (String(video.broadcast_id) === String(streamID)) { // I am lazy
                            callback(null, video);
                            return;
                        }
                    }
                }
            }
            offset += limit;
            request(callback);
        });
    }
};

// Callback: err, video
TwitchClient.prototype.getVideo = function (videoID, callback) {
    this.request('/videos/' + videoID, function (err, data) {
        if (err) {
            callback(err);
            return;
        }
        callback(err, data);
    });
};

// Callback: err, stream
TwitchClient.prototype.getChannelStream = function(channelID, callback) {
    this.request('/streams/' + channelID, function (err, data) {
        if (err) {
            callback(err);
            return;
        }
        if (data.stream) {
            callback(null, data.stream);
        } else {
            callback('Invalid stream server response');
        }
    });
};

// Callback: err
TwitchClient.prototype.followChannel = function (channel, callback) {
    if (this.userID == null) {
        callback('User id not defined, use onUserID(callback)');
        return
    }
    this.getChannelIDByName(channel, function (err, channelID) {
        if (err) {
            callback(err);
            return;
        }
        if (channelID != null) {
            this.put('/users/' + this.userID + '/follows/channels/' + channelID, function (err) {
                if (err) {
                    callback(err);
                }
            });
        }
    });
};

// Callback: err, array of follows
TwitchClient.prototype.getFollowed = function (callback) {
    var self = this;
    if (self.userID == null) {
        callback('User id not defined, use onUserID(callback)');
        return;
    }
    var limit = 100; // max 100
    var offset = 0;
    var out = [];

    request(callback);

    function request(callback) {
        self.request('/users/' + self.userID + '/follows/channels?limit=' + limit + '&offset=' + offset, function (err, data) {
            if (err) {
                callback(err);
                return;
            }
            var done = data['_total'] <= limit + offset;
            for (let i = 0; i < data.follows.length; i++) {
                out.push(data.follows[i]);
            }
            offset += limit;
            if (!done) {
                request(callback);
            } else {
                callback(null, out);
            }
        });
    }
};

