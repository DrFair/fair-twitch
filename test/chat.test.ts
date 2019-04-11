import TwitchIRC from '../src/chat';
import 'mocha';

describe('Chat', function() {
  this.slow(1000);
  this.timeout(5000);

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

});