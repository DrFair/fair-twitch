import TwitchIRC from '../src/chat';
import { expect } from 'chai';
import 'mocha';

describe('Chat', () => {
  const chat = new TwitchIRC();
  let innerDone = null;
  chat.on('error', (err) => {
    chat.removeAllListeners();
    if (innerDone) innerDone(err);
  })

  it('Should connect properly', (done) => {
    innerDone = done;
    chat.once('ready', () => {
      done();
    });
  });

  it('Should join "twitch" channel properly', (done) => {
    innerDone = done;
    chat.join('twitch', () => {
      done();
    });
  });

  it('Should part "twitch" channel properly', (done) => {
    innerDone = done;
    chat.part('twitch', () => {
      done();
    });
  });

  it('Should close connection properly', (done) => {
    innerDone = done;
    chat.close((err) => {
      if (err) done(err);
      else done();
      chat.removeAllListeners();
    });
  });

});