fair-twitch is a [Twitch API](https://dev.twitch.tv/docs/api) and [Chat bot](https://dev.twitch.tv/docs/irc/) library written in [JavaScript](http://en.wikipedia.org/wiki/JavaScript) for [Node](http://nodejs.org/).

Note: This was made for personal use, so it probably won't be supported that much. That being said, you can always submit issues and pull requests and I will look at them.

## Table of contents

- [Installation](#installation)
- [Basic setup](#basic-setup)
- [API usage](#api-usage)
  - [API constructor options](#api-constructor-options)
  - [API events](#api-events)
- [Chat usage](#chat-usage)
  - [Chat events](#chat-events)
  - [Chat constructor options](#chat-constructor-options)
- [Chat notifications emitter](#chat-notifications-emitter)
  - [Notifications emitter events](#notifications-emitter-events)
- [Chat room tracker](#chat-room-tracker)
  - [Room tracker events](#room-tracker-events)
- [Migrating from 1.x](#migrating-from-1x)

## Installation

Install via npm:

```
npm install fair-twitch
```

## Basic setup

The module is divided up into a chat and API part. The API part handes api requests, while the chat handles Twitch IRC.
```
var fairTwitch = require('fair-twitch');

var api = new fairTwitch.api(<options>);
// Do api stuff

var chat = new fairTwitch.chat(<option>);
// Do chat stuff...
```

## API usage
To use the API you need to have or register a Twitch developer application to get a client ID.

You can do that on the [Twitch Developer Apps Dashboard](https://dev.twitch.tv/console/apps).

Once you have a clientID, you can start a simple API client:

```
var fairTwitch = require('fair-twitch');
var api = new fairTwitch.api('<Your Twitch client ID>');
```

Some API calls require OAuth token, client secret, redirect URL. These can be added to the constructor options:

```
var fairTwitch = require('fair-twitch');
var api = new fairTwitch.api({
  clientID: '<Your Twitch client ID',
  clientSecret: 'Your Twitch client secret',
  redirectURL: 'Your Twitch OAuth redirect URL',
  refreshToken: 'Account OAuth refresh token',
  accessToken: 'Account OAuth access token'
});
```
The access token will be automatically refreshed before a request if one of these conditions is met:
- The refresh token is not null while the access token is null.
- Retry latest request after token refresh if it emitted a 401 authentication failed response.
- accessTokenExpireTS option is close to or less than ```Date.now()```.

You can disable auto token refresh using the ```autoRefreshAccessToken``` constructor option.

The api will automatically validate access token on construction, unless ```validateToken``` constructor option is false. You can find more info on constructor options further down.

The API will try to figure out if the call is for Twitch new API or API v5 and change authorization header accordingly. Find calls in Twitch [New API reference](https://dev.twitch.tv/docs/api/reference/) or [API v5 reference](https://dev.twitch.tv/docs/v5/).

```
api.get('<API call>', function(err, data) {
  // Handle error and data
});

api.post('<API call>', function(err, data) {
  // Handle error and data
});

api.delete('<API call>', function(err, data) {
  // Handle error and data
});

api.put('<API call>', function(err, data) {
  // Handle error and data
});
```
The API will add client ID and authorization headers automatically. If you don't want to add a header, you can pass in an options parameter instead:
```
api.get({
  url: 'helix/streams',
  clientID: null, // Null to ignore client ID header
  accessToken: null // Null to ignore access token header
}, function(err, data) {
  // Handle error and data
});
```
The api also contains functions like ```api.getAuthenticationURL(...scopes)``` and ```api.getRefreshToken(code, callback)``` to help with the Twitch authentication process. An example of [OAuth Authorization Code Flow](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/#oauth-authorization-code-flow) using express can be seen [here](examples/authexample.js).


### API constructor options
|Option|Default|Description|
|---|---|---|
|clientID|null|Your Twitch client ID|
|clientSecret|null|Your Twitch client secret|
|redirectURL|null|Your Twitch OAuth redirect URL|
|refreshToken|null|Account OAuth refresh token|
|accessToken|null|Account OAuth access token|
|accessTokenExpiresTS|null|The timestamp of when the access token expires. Null means never prompt a refresh using the timestamp.|
|autoRefreshToken|true|If api should auto refresh token on authorization failed error and try again|
|validateToken|true|If the api should validate token on construction|
|apiURL|'https://api.twitch.tv/'|The Twitch API base URL|
|authURL|'https://id.twitch.tv/'|The Twitch auth base URL|

### API events
|Event|Args|Description|
|---|---|---|
|error|any|When an error happens in the other events|
|tokenvalidate|data|When the accesstoken was validated. Can be manually done with ```api.validateAccessToken()```|
|tokenrefresh|data|When the access token was refreshed. Can be manually done with ```api.refreshAccessToken()```|
|debug|...any|Debug messages|

## Chat usage
Chat can either log in anonymously (unable to send chat messages) or by using a valid access token with chat scopes and a login.

Login to chat anonymously:
```
var fairTwitch = require('fair-twitch');
var chat = new fairTwitch.chat();
chat.on('ready', function() {
  // I have now successfully connected and authenticated!
});
```

Login to chat with token:
```
var fairTwitch = require('fair-twitch');
var chat = new fairTwitch.chat({
  login: '<Your Twitch login>',
  token: '<Your OAuth access token>'
});
chat.on('ready', function() {
  // I have now successfully connected and authenticated!
});
```
An OAuth token can be [generated here](https://twitchapps.com/tmi/) or you can do it with your own application by following [Twitch's authentication process](https://dev.twitch.tv/docs/authentication/).

Join and leave channel chat rooms:
```
chat.join('<channel>', [callback]);
chat.part('<channel>', [callback]);
```

Send chat messages:
```
chat.say('<channel>', '<message>');
```

The chat automatically parses irc messages and emits events for specific messages. See further down for all events emitted.

Some other basic events:
```
chat.on('error', function(error) {
  // Handle errors
});

chat.on('msg', function(channel, login, message, tags) {
  // Handle a message.
  // Tags contains a bunch of information like bits.
});

chat.on('usernotice', function(channel, login, message, tags) {
  // Handle subs, resubs, giftsubs and so on.
  // Tags contains a bunch of information.
});
```

I've created some wrappers to help handle notifications and joined channels.
You can create them using:
```
var notifications = chat.createNotificationsEmitter();
// If done with it, run notifications.dispose();

var roomTracker = chat.createRoomTracker();
// If done with it, run roomTracker.dispose();
```
Read more about [NotificationsEmitter](#chat-notifications-emitter) or [RoomTracker](#chat-room-tracker) futher below.

### Chat events
|Event|Args|Description|
|---|---|---|
|error|any|When an error has happened|
|parseerror|line, error|When a parse error happens|
|ready|none|When successfully connected and authorized|
|raw|message, parsed|A raw IRC event|
|rawSend|message|When a raw message is sent out|
|join|channel|When you have joined a channel|
|part|channel|When you have left a channel|
|userjoin|channel, login|When a user joined a channel|
|userpart|channel, login|When a user left a channel|
|msg|channel, login, message, tags|When a message was submitted to a channel|
|roomstate|channel, tags|When a channel changes its roomstate (like submode, slowmode)|
|usernotice|channel, login, message, tags|When a usernotice has happened (like a sub, resub, giftsub)|
|notice|channel, message, tags|When a channel notice happens (example: slow mode off)|
|clearchat|channel|Happens when a chat is cleared by a moderator|
|userban|channel, login, tags|User was permanently or temporarily banned (tags has ban-duration if not permanent)|
|clearmsg|channel, tags|Happens when a single message was removed|
|globaluserstate|tags|Happens on successful login, tags contain information about user. Note: Does not happen on anonymous logins|
|userstate|channel, tags|Happens when you join a channel, tags contain information about user|
|host|channel, target, \[viewers\]|Happens when a channel hosts a target channel. Viewers is a number when started hosting, undefined if already hosting. If taget is '-', it means it stopped hosting|

### Chat constructor options
|Option|Default|Description|
|---|---|---|
|login|null|The Twitch login.|
|token|null|The Twitch auth token. Required if login is given. Example: ```cfabdegwdoklmawdzdo98xt2fo512y```|
|autoReconnect|true|If it should autoconnect on connection loss|
|requestCAP|true|If you want to request Twitch capabilities|
|autoConnect|boolean|If you want to connect automatically on construction|
|url|'irc.chat.twitch.tv'|The Twitch IRC URL|
|port|6667|The Twitch IRC Port|
|successMessages|custom array of strings|Some of the required messages for a successful connect. See [irc docs](https://dev.twitch.tv/docs/irc/guide/#connecting-to-twitch-irc) for information. Do not change unless the default is not updated for it|

## Chat notifications emitter
Chat notifications emitter is a chat wrapper that helps with handling usernotice and bits messages. The object is an event emitter.

Create a notifications emitter:
```
var notifications = chat.createNotificationsEmitter();
notifications.on('sub', function(channel, data) {
  // Handle new subscription in channel
});
```

Dispose emitter when done:
```
// This will remove listeners from chat object
notifications.dispose();
```

### Notifications emitter events
|Event|Args|Description|
|---|---|---|
|sub|channel, data, tags|When a new subscription happens|
|resub|channel, data, tags|When a resubscription happens|
|giftsub|channel, data, tags|When someone gifts another user a subscription (does not emit each from massgiftsub)|
|massgiftsub|channel, data, tags|When someone mass gift subs to a channel. Data contains information about all recepients|
|bits|channel, data, tags|When someone sends bit message to a channel|
|any|event, channel, data, tags|When any of the above events happen|

## Chat room tracker
Chat room tracker is a chat wrapper that helps with handling which channels/rooms you have joined and what it's room states are. The object is an event emitter.

Create a room tracker:
```
var roomTracker = chat.createRoomTracker();
roomTracker.on('<event>', ...);
```

Dispose emitter when done:
```
// This will remove listeners from chat object
roomTracker.dispose();
```

Print out the rooms you're in:
```
roomTracker.rooms.forEach(function(room) {
  console.log('I am in channel #' + room.channel);
  console.log('Channel state:', room.state);
});
```
Notice that the room tracker will only track new ```join``` and ```part``` events.

### Room tracker events
|Event|Args|Description|
|---|---|---|
|join|channel|When a channel is joined|
|part|channel|When a channel is left|
|state|channel, state|When a channel room state has changed|
|change|channel|When any changes has been made to any room (join, left, state)|

## Migrating from 1.x
The module has gone under a complete rewrite from 1.x to 2.x to work with the new Twitch api and chat. It's recommended that you either keep 1.x or rebuild your app using the new docs from this readme.