import path from 'path';
import dotenv from 'dotenv';
import TwitchAPI from '../src/api';
import 'mocha';

describe('api', function() {
  this.slow(1000);
  this.timeout(5000);
  let api: TwitchAPI;
  dotenv.config({ path: path.join(__dirname, '../.env.test') });

  it('setup', () => {
    api = new TwitchAPI(process.env.CLIENT_ID);
    api.on('error', (err) => {
      console.log('Error testing api');
      throw new Error(err);
    });
  });

  it('get streams new', (done) => {
    api.get('helix/streams', (err, data) => {
      if (err) done(err);
      if (data.error) done(data);
      else done();
    });
  });

  it('get streams v5', (done) => {
    api.get('kraken/streams', (err, data) => {
      if (err) done(err);
      if (data.error) done(data);
      else done();
    });
  });
});