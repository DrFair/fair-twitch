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
        apiURL: 'https://api.twitch.tv/helix',
        clientID: null,
        secret: null,
        redirect_uri: null,
        login: null,
        token: null,
        refreshToken: null,
        chat: true // whether or not to try and connect to chat if scope is available
    };

    self.setOptions(options);

    if (typeof(self.options.clientID) !== 'string') {
        throw new Error('Invalid clientID');
    }

    // This is sent to chat once it's initialized
    self.chatConnectedCallbacks = [];

    self.chat = null;

    if (self.options.token || self.options.refreshToken) {
        self.validate(function (err, json) {
            if (err) {
                console.log('Error on auth token ' + self.options.token);
                return;
            }
            if (json.login) {
                self.userID = json.user_id;
                self.options.login = json.login;
                self.login = self.options.login;
                self.options.scopes = json.scopes;
                if (self.options.chat) {
                  // Search for chat login scope, and when found, start the chat api
                  for (var i = 0; i < self.options.scopes.length; i++) {
                    if (self.options.scopes[i] == 'chat_login') {
                      self.chat = new chat.TwitchBot(self.options, channels);

                      for (var i in self.chatConnectedCallbacks) {
                          self.chat.onConnected(self.chatConnectedCallbacks[i]);
                      }
                      break;
                    }
                  }
                }
                delete self.chatConnectedCallbacks;
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

TwitchClient.prototype.onChatConnected = function (callback) {
    if (this.chat != null) {
        this.chat.onConnected(callback);
    } else {
        this.chatConnectedCallbacks.push(callback);
    }
};

// HTTP Request parts

TwitchClient.prototype.getRequestHeaders = function () {
    return {
        'Client-ID': this.options.clientID,
        'Authorization': 'Bearer ' + this.options.token
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
TwitchClient.prototype.validate = function (token, callback) {
    var self = this;
    if (typeof(token) == 'function') {
        callback = token;
        token = self.options.token;
    }
    if (self.options.refreshToken) {
        self.refreshToken(function (err, data) {
            if (err) {
                return callback(err);
            }
            token = data.access_token;
            self.options.token = data.access_token;
            return val();
        });
    } else {
        return val();
    }
    function val() {
        var options = {
          url: 'https://id.twitch.tv/oauth2/validate',
          headers: {
            'Authorization': 'OAuth ' + token
          }
        };
        self.rawRequest(options, function (err, response, body) {
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
    }
}

// Callback: err, data
TwitchClient.prototype.request = function (apicall, callback, replacementAuth) {
    var options = {
        url: this.options.apiURL + apicall,
        headers: this.getRequestHeaders()
    };
    if (replacementAuth) {
        options.headers['Authorization'] = 'Bearer ' + replacementAuth;
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
        headers: this.getRequestHeaders()
    };
    if (typeof postData === 'function') {
        callback = postData;
        console.log('Ah yea')
    } else {
        options.formData = postData;
    }
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
TwitchClient.prototype.delete = function (apicall, callback) {
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
TwitchClient.prototype.getAuthToken = function (code, callback) {
    var options = {};
    options.url = 'https://id.twitch.tv/oauth2/token' +
        '?client_id=' + this.options.clientID +
        '&client_secret=' + this.options.secret +
        '&code=' + code +
        '&grant_type=authorization_code' +
        '&redirect_uri=' + this.options.redirect_uri;
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

// This requires clientID, secret, refreshToken in twitch app
// Callback: err, data
TwitchClient.prototype.refreshToken = function (refreshToken, callback) {
  if (typeof(refreshToken) == 'function') {
      callback = refreshToken
      refreshToken = this.options.refreshToken;
  }
  var options = {};
  options.url = 'https://id.twitch.tv/oauth2/token' +
      '?grant_type=refresh_token' +
      '&refresh_token=' + refreshToken +
      '&client_id=' + this.options.clientID +
      '&client_secret=' + this.options.secret;
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
}

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
    var self = this;
    if (this.userID == null) {
        callback('User id not defined, use onUserID(callback)');
        return
    }
    self.getChannelIDByName(channel, function (err, channelID) {
        if (err) {
            callback(err);
            return;
        }
        if (channelID != null) {
            self.put('/users/' + self.userID + '/follows/channels/' + channelID, function (err) {
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
