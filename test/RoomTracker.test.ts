import TwitchIRC from '../src/chat';
import RoomTracker from '../src/RoomTracker';
import 'mocha';
import { expect } from 'chai';

describe('RoomTracker', () => {
  let chat: TwitchIRC;

  before((done) => {
    chat = new TwitchIRC();
    chat.once('ready', () => {
      done();
    });
  });

  describe('dispose', () => {
    let tracker: RoomTracker;

    it('Create tracker', () => {
      tracker = chat.createRoomTracker();
    });

    it('Listener count before dispose', () => {
      expect(chat.listenerCount('join')).to.be.greaterThan(0);
    });

    it('Listener count after dispose', () => {
      tracker.dispose();
      expect(chat.listenerCount('join')).to.be.lessThan(1);
    });
    
  });

  describe('isInChannel', () => {
    let tracker: RoomTracker;

    it('Create tracker', () => {
      tracker = chat.createRoomTracker();
    });

    it('Join "twitch"', function(done) {
      this.slow(1000);
      chat.join('twitch', () => {
        done();
      });
    });

    it('isInChannel true', () => {
      expect(tracker.isInChannel('twitch')).to.be.true;
    });

    it('Leave "twitch"', function(done) {
      this.slow(1000);
      chat.part('twitch', () => {
        done();
      });
    });

    it('isInChannel false', () => {
      expect(tracker.isInChannel('twitch')).to.be.false;
    });
    
  });

  after((done) => {
    chat.close((err) => {
      done(err);  
      chat = null;
    });
  });


});