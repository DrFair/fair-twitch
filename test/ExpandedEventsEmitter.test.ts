import ExpandedEventEmitter from '../src/ExpandedEventEmitter';
import 'mocha';
import { expect, assert } from 'chai';

describe('ExpandedEventEmitter', () => {

  describe('Basic event emitter', () => {
    let emitter: ExpandedEventEmitter;
    it('Constructs', () => {
      emitter = new ExpandedEventEmitter();
    });

    it('listenerCount', () => {
      emitter.on('register#my-id', () => {
        // Do nothing
      });
      expect(emitter.listenerCount('register')).to.equal(1);
      expect(emitter.listeners('register')).to.have.lengthOf(1);
    });

    it('removeAllListeners', () => {
      emitter.removeAllListeners();
      expect(emitter.listenerCount('register')).to.equal(0);
    });

    it('once', () => {
      let calls = 0;
      emitter.once('testonce#my-id', () => {
        calls++;
      });
      emitter.emit('testonce');
      emitter.emit('testonce');
      expect(emitter.listenerCount('testonce')).to.equal(0);
      expect(calls).to.equal(1);
    });

    it('on', () => {
      let calls = 0;
      emitter.on('teston#my-id', () => {
        calls++;
      });
      emitter.emit('teston');
      emitter.emit('teston');
      expect(emitter.listenerCount('teston')).to.equal(1);
      expect(calls).to.equal(2);
    });
  });

  describe('Expanded emitter', () => {
    let emitter = new ExpandedEventEmitter();
    emitter.on('testevent#my-id', () => {
      // Do nothing
    });
    emitter.on('testevent#my-other-id', () => {
      // Do nothing
    });

    it('getIDListeners length', () => {
      expect(emitter.getIDListeners('my-id')).to.have.length(1);
    });

    it('getIDListeners event length', () => {
      expect(emitter.getIDListeners('my-id', 'testevent')).to.have.length(1);
    });

    it('getIDListeners other event length', () => {
      expect(emitter.getIDListeners('my-id', 'otherevent')).to.have.length(0);
    });

    it('getIDListeners random id length', () => {
      expect(emitter.getIDListeners('my-random-id', 'testevent')).to.have.length(0);
    });

    it('removeIDListeners listenerCount', () => {
      emitter.removeIDListeners('my-id');
      expect(emitter.listenerCount('testevent')).to.equal(1);
    });

    it('removeIDListeners length', () => {
      expect(emitter.getIDListeners('my-id')).to.have.length(0);
    });

  });

});