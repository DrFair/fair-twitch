// This is an example of the Twitch OAuth Authorization Code Flow using express.
// We expect our Twitch redirect URL to be http://localhost:3000/auth

// First we require our .env file containing our Twitch dev application details using the dotenv module
require('dotenv').config({ path: './.env' });

// Create our TwitchAPI object
var TwitchAPI = require('fair-twitch').api;
var api = new TwitchAPI({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  redirectURL: process.env.REDIRECT_URL
});

// Create our express app
var express = require('express');
var app = express();
var port = 3000;

// Handle our home page route, send the authorization link
app.get('/', function(req, res) {
  var authURL = api.getAuthenticationURL(
    'channel:moderate',
    'chat:edit',
    'chat:read',
    'whispers:read',
    'whispers:edit',
    'user_read'
  );
  // It's recommended you add a state to the authURL like this:
  // authURL += '&state=<Your generated state>';
  res.send(`<a href="${authURL}">Login with Twitch</a>`)
});

// Handle our Twitch redirect route
app.get('/auth', function(req, res) {
  if (req.query.code) {
    // Check for req.query.state if added here
    api.getRefreshToken(req.query.code, function(err, data) {
      if (err) res.send('Error getting refresh token');
      else res.send(`<pre>${JSON.stringify(data, null, 2)}</pre>`);
    });
  } else {
    res.redirect('/');
  }
});

// Start our server
app.listen(port, function() {
  console.log(`Started server on port ${port}!`);
});