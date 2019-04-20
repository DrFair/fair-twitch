import path from 'path';
import dotenv from 'dotenv';
import TwitchIRC from '../src/chat';
import TwitchAPI from '../src/api';
import 'mocha';
import { expect } from 'chai';
import { doesNotReject } from 'assert';

describe('Chat', function() {
  this.slow(1000);
  this.timeout(5000);
  dotenv.config({ path: path.join(__dirname, '../.env.test') });

  describe('Create, auto connect, ready, close', () => {
    let chat: TwitchIRC;
    let innerDone = null;

    it('Create', (done) => {
      chat = new TwitchIRC();
      chat.on('error', (err) => {
        chat.removeAllListeners();
        if (innerDone) innerDone(err);
      });
      done();
    });

    it('Connect, ready', (done) => {
      innerDone = done;
      chat.once('ready', () => {
        done();
      });
    });

    it('Close', (done) => {
      innerDone = done;
      chat.close((err) => {
        if (err) done(err);
        else done();
        chat.removeAllListeners();
      });
    });
  });

  describe('Create, connect, ready, close', () => {
    let chat: TwitchIRC;
    let innerDone = null;

    it('Create', (done) => {
      chat = new TwitchIRC({
        autoConnect: false
      });
      chat.on('error', (err) => {
        chat.removeAllListeners();
        if (innerDone) innerDone(err);
      });
      done();
    });

    it('Connect', (done) => {
      innerDone = done;
      chat.connect(() => {
        done();
      });
    });

    it('Ready', (done) => {
      innerDone = done;
      chat.once('ready', () => {
        done();
      });
    });

    it('Close', (done) => {
      innerDone = done;
      chat.close((err) => {
        if (err) done(err);
        else done();
        chat.removeAllListeners();
      });
    });
  });

  describe('Connect, ready, join channel, close', () => {
    let chat: TwitchIRC;
    let innerDone = null;

    it('Create', (done) => {
      chat = new TwitchIRC();
      chat.on('error', (err) => {
        chat.removeAllListeners();
        if (innerDone) innerDone(err);
      });
      done();
    });

    it('Connect, ready', (done) => {
      innerDone = done;
      chat.once('ready', () => {
        done();
      });
    });

    it('Join "twitch" channel', (done) => {
      innerDone = done;
      chat.join('twitch', () => {
        done();
      });
    });

    it('Part "twitch" channel', (done) => {
      innerDone = done;
      chat.part('twitch', () => {
        done();
      });
    });

    it('Close', (done) => {
      innerDone = done;
      chat.close((err) => {
        if (err) done(err);
        else done();
        chat.removeAllListeners();
      });
    });
  });

  describe('Authorized login', function() {
    this.slow(2000);
    let api: TwitchAPI;
    let chat: TwitchIRC;
    let twitchLogin: string;

    it('API setup', () => {
      api = new TwitchAPI({
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        refreshToken: process.env.REFRESH_TOKEN,
        validateToken: false
      });
      api.on('error', (err) => {
        console.log('Error testing api');
        throw new Error(err);
      });
    });

    it('API get accessToken', (done) => {
      api.refreshAccessToken((err) => {
        if (err) done(err);
        else {
          expect(api.options.accessToken).to.not.be.null;
          done();
        }
      });
    });

    it('API validate accessToken, get login', (done) => {
      api.validateAccessToken((err, data) => {
        if (err) done(err);
        else {
          expect(data).to.have.property('login');
          twitchLogin = data.login;
          done();
        }
      });
    });

    it('Chat setup, login', (done) => {
      chat = new TwitchIRC({
        login: twitchLogin,
        token: api.options.accessToken
      });
      chat.on('globaluserstate', (tags) => {
        expect(tags).to.have.property('display-name');
        expect(tags).to.have.property('user-id');
        done();
      });
    });

    it('Chat close', (done) => {
      chat.close((err) => {
        if (err) done(err);
        else done();
        chat.removeAllListeners();
      });
    });

  });

});