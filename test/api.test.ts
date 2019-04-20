import path from 'path';
import dotenv from 'dotenv';
import TwitchAPI from '../src/api';
import 'mocha';
import { expect } from 'chai';

describe('API', function() {
  this.slow(2000);
  this.timeout(5000);
  dotenv.config({ path: path.join(__dirname, '../.env.test') });

  describe('Basic functionality', () => {
    let api: TwitchAPI;
  
    it('Setup', () => {
      api = new TwitchAPI(process.env.CLIENT_ID);
      api.on('error', (err) => {
        console.log('Error testing api');
        throw new Error(err);
      });
    });
  
    it('Get new helix/streams', (done) => {
      api.get('helix/streams', (err, data) => {
        if (err) done(err);
        if (data.error) done(data);
        else done();
      });
    });
  
    it('Get v5 kraken/streams', (done) => {
      api.get('kraken/streams', (err, data) => {
        if (err) done(err);
        if (data.error) done(data);
        else done();
      });
    });
  })

  describe('Refresh access token, validate', () => {
    let api: TwitchAPI;

    it('Setup', () => {
      api = new TwitchAPI({
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        refreshToken: process.env.REFRESH_TOKEN,
        validateToken: false,
        autoRefreshToken: false
      });
      api.on('error', (err) => {
        console.log('Error testing api');
        throw new Error(err);
      });
    });

    it('refreshAccessToken', (done) => {
      api.refreshAccessToken((err) => {
        if (err) done(err);
        else {
          expect(api.options.accessToken).to.not.be.null;
          done();
        }
      });
    });
    
    it('validateAccessToken', (done) => {
      api.validateAccessToken((err, data) => {
        if (err) done(err);
        else if (data.error) done(data);
        else {
          expect(data).to.have.property('client_id', process.env.CLIENT_ID);
          done();
        }
      });
    });
  });

  describe('Auto refresh access token', () => {
    let api: TwitchAPI;

    it('Setup, tokenvalidate event', function(done) {
      this.slow(3000);
      api = new TwitchAPI({
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        refreshToken: process.env.REFRESH_TOKEN
      });
      api.on('error', (err) => {
        console.log('Error testing api');
        throw new Error(err);
      });
      api.on('tokenvalidate', (data) => {
        done();
      });
    });

    it('Get helix/users', (done) => {
      api.get('helix/users', (err, data) => {
        if (err) done(err);
        else done();
      });
    });

  });
});