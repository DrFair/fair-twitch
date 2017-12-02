fair-twitch is a Twitch API and Chat bot library written in [JavaScript](http://en.wikipedia.org/wiki/JavaScript) for [Node](http://nodejs.org/).

Note: This was made for personal use, so it probably won't be supported that much. That being said, you can always submit issues and pull requests and I will look at them.

## Installation

Install via npm:

```
npm install fair-twitch
```

## Basic setup

To use it you first need to register a Twitch developer application to get a client ID.

You can do that on the [Twitch connections page](https://www.twitch.tv/settings/connections).

When you have a client ID, you can start a simple API client like this:

```
var fairTwitch = require('fair-twitch');
var client = new fairTwitch.TwitchClient('<Your Twitch client ID>');
```

Some API calls require a OAuth token, client secret and redirect URI. You can add those to the options this way:

```
var client = new fairTwitch.TwitchClient({
    clientID: '<Your Twitch client ID>',
    secret: '<Your Twitch secret>',
    redirect_uri: '<Your Twitch authorization redirect URI>',
    token: '<Your account authorization token>'
});
```

Note that for chat to work, you need the authorization token to have chat_login scope. An OAuth token can be [generated here](https://twitchapps.com/tmi/) or you can do it with your own application by following [Twitch's authentication process](https://dev.twitch.tv/docs/v5/guides/authentication/). If the token has the chat_login scope, but you don't want to use chat, you can pass the option ```chat: false``` in the client constructor.

Example of an OAuth token is: ```'cfabdegwdoklmawdzdo98xt2fo512y'```

## Basic usage

All API calls can be found in the [official Twitch API Reference](https://dev.twitch.tv/docs/v5/guides/using-the-twitch-api/).

An example of how to get all streams summary:

```
client.request('/streams/summary', function (err, data) {
    if (err) {
        // Handle error
    } else {
        // Handle twitch data
    }
});
```

There's a bunch of built in API call functions that I did for personal use, but in general, just use these with the [Twitch API Reference](https://dev.twitch.tv/docs/v5/guides/using-the-twitch-api/) :

```
// For GET methods:
client.request('<API call>', function (err, data) {
    // Handle error and data
});

// For PUT methods:
client.put('<API call>', function (err, data) {
    // Handle error and data
});

// For POST methods:
client.post('<API call>'[, postData], function (err, data) {
    // Handle error and data
});

// For DELETE methods:
client.delete('<API call>', function (err, data) {
    // Handle error and data
});
```

Before doing chat commands, you have to wait for it to successfully login, this is done from the onChatConnected event:

```
client.onChatConnected(function (user) {
    // Do stuff, add event listeners etc
});
```

## Chat events

Handle errors that happens on chat:

```
client.chat.onError(function (err) {
    // Handle error
});
```

Join and leave channels:

```
client.chat.joinChannel('twitch');
client.chat.leaveChannel('twitch');
```

Listen for a room change (slow mode, subscribers only mode etc.):

```
client.chat.onRoomChange(['<channel>',] function (state, firstJoin) {
    // Do stuff
});
```

Note: firstJoin callback is only defined if channel parameter is and be true if you just joined the room, else false. So this can also be used to trigger a channel join event.

Listen for all chat messages:

```
client.chat.listen(function (user) {
    console.log('Message from ' + user.display_name + ' in ' + user.channel + ': ' + user.msg);
});
```

Listen for subscriptions:

```
client.chat.listenSubs(function (user, months, tier) {
    console.log('New subscription to ' + user.channel + ' - ' + user.display_name + ' for ' + months + ' months with tier ' + tier + ': ' + user.msg);
});
```

Listen for specific chat commands:

```
client.chat.listenCommand('!help', function (user) {
    // Handle chat message that starts with !help
}[, caseSensitive]);
```

Listen for chat message:

```
client.chat.listenMsg('Kappa', function (user) {
    // Handle chat message that contains kappa
}[, caseSensitive]);
```

Listen for whispers to you:

```
client.chat.listenWhisper(function (user) {
    // Handle whisper from user
});
```

Send a chat message to a join channel:

```
client.chat.msg('<channel>', '<message>');
```

The library uses [node-irc](https://github.com/martynsmith/node-irc). The node-irc client object can be accessed from ```client.chat.irc```
