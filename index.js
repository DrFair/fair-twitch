var request = require('request');
var chat = require('./chat');

exports.TwitchClient = TwitchClient;

function TwitchClient(apiOptions, chatOptions, channels) {
    var self = this;

    self.userID = null;

    self.options = {
        apiURL: 'https://api.twitch.tv/kraken',
        headers: {
            'Accept': 'application/vnd.twitchtv.v5+json',
            'Client-ID': apiOptions.clientID
        },
        clientID: apiOptions.clientID,
        secret: apiOptions.secret,
        redirect_uri: apiOptions.redirect_uri
    };
    if (chatOptions) {
        self.options.headers['Authorization'] = 'OAuth ' + chatOptions.token;
    }

    self.setOptions(apiOptions);

    // Used to store callbacks of when user id is retrieved
    self.userIDCallbacks = [];

    self.chat = null;

    // Chat parts
    if (chatOptions) {
        self.getChannelIDByName(chatOptions.login, function (err, id) {
            if (err) {
                return;
            }
            self.userID = id;
            for (var i in self.userIDCallbacks) {
                self.userIDCallbacks[i]();
            }
        });

        self.chat = new chat.TwitchBot(chatOptions, channels);
    }
}

TwitchClient.prototype.setOptions = function (options) {
    for (var i in options){
        if (this.options[i] != undefined){ // Only override if the passed in value is actually defined
            this.options[i] = options[i];
        }
    }
};

// HTTP Request parts

TwitchClient.prototype.rawRequest = function(options, callback) {
    request(options, callback);
};

TwitchClient.prototype.rawPut = function (options, callback) {
    request.put(options, callback);
};

TwitchClient.prototype.rawPost = function (options, callback) {
    request.post(options, callback);
};

// Callback: err, json
TwitchClient.prototype.request = function (apicall, callback, replacementAuth) {
    var options = {
        url: this.options.apiURL + apicall,
        headers: this.options.headers
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

// Callback: err, json
TwitchClient.prototype.put = function (apicall, callback) {
    var options = {
        url: this.options.apiURL + apicall,
        headers: this.options.headers
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

// Callback: err, json
TwitchClient.prototype.post = function (apicall, postData, callback) {
    var options = {
        url: this.options.apiURL + apicall,
        headers: this.options.headers,
        formData: postData
    };
    this.rawPost(options, function (err, response, body) {
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

// This requires secret and redirect uri in twitch app
TwitchClient.prototype.getAuthToken = function (code, state, callback) {
    var postData = {
        client_id: this.options.clientID,
        client_secret: this.options.secret,
        grant_type: 'authorization_code',
        redirect_uri: this.options.redirect_uri,
        code: code,
        state: state
    };
    this.post('/oauth2/token', postData, function (err, json) {
        if (err) {
            console.log('Get auth token error:');
            console.log(err);
            return;
        }
        callback(json);
    });
};

// Callback: err, json
TwitchClient.prototype.getOtherAuthSummary = function (auth, callback) {
    this.request('/', function (err, json) {
        if (err) {
            callback(err);
            return;
        }
        callback(null, json);
    }, auth);
};

// Callback: err, json
TwitchClient.prototype.getAuthSummary = function (callback) {
    this.request('/', function (err, json) {
        if (err) {
            callback(err);
            return;
        }
        callback(null, json);
    });
};

// Callback: err, json
TwitchClient.prototype.getChannelByID = function (channelID, callback) {
    this.request('/channels/' + channelID, function (err, json) {
        if (err) {
            callback(err);
            return;
        }
        callback(null, json);
    });
};

// Callback: err, channelID
TwitchClient.prototype.getChannelIDByName = function (channelName, callback) {
    this.request('/users?login=' + channelName, function (err, json) {
        if (err) {
            callback(err);
            return;
        }
        if (json.users && json.users[0] != undefined) {
            callback(null, json.users[0]._id);
            return;
        }
        callback(null, null);
    });
};

// Callback: err, channel
TwitchClient.prototype.getChannelByName = function (channelName, callback) {
    this.request('/users?login=' + channelName, function (err, json) {
        if (err) {
            callback(err);
            return;
        }
        if (json.users && json.users[0] != undefined) {
            callback(null, json.users[0]);
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
        self.request('/channels/' + channelID + '/videos?broadcasts=true&limit=' + limit + '&offset=' + offset, function (err, json) {
            if (err) {
                callback(err);
                return;
            }
            if (json.videos) {
                for (var i = 0; i < json.videos.length; i++) {
                    var video = json.videos[i];
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
    this.request('/videos/' + videoID, function (err, json) {
        if (err) {
            callback(err);
            return;
        }
        callback(err, json);
    });
};

// Callback: err, stream
TwitchClient.prototype.getChannelStream = function(channelID, callback) {
    this.request('/streams/' + channelID, function (err, json) {
        if (err) {
            callback(err);
            return;
        }
        if (json.stream) {
            callback(null, json.stream);
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
        self.request('/users/' + self.userID + '/follows/channels?limit=' + limit + '&offset=' + offset, function (err, json) {
            if (err) {
                callback(err);
                return;
            }
            var done = json['_total'] <= limit + offset;
            for (let i = 0; i < json.follows.length; i++) {
                out.push(json.follows[i]);
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

// Used to all event triggers for when user id is retrieved
TwitchClient.prototype.onUserID = function (callback) {
    this.userIDCallbacks.push(callback);
};

// Chat part

