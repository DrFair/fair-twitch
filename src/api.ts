import request from 'request';
import ExpandedEventEmitter from './ExpandedEventEmitter';

interface APIOptionsParam {
  /** Your API application client id */
  clientID?: string,
  /** Your API application client secret */
  clientSecret?: string,
  /** Your API application redirect Oauth URL */
  redirectURL?: string,
  /** 
   * Refresh token if you need to do authorized requests.
   * It will use this to generate new accessTokens if it has none or they become expired.
   */
  refreshToken?: string,
  /** Your access token. If you already have an access token refresh */
  accessToken?: string,
  /** If the api should automatically refresh access token if getting an unauthorized error. Defaults to true */
  autoRefreshToken?: boolean,
  /** If should validate token on construction. Defaults to true */
  validateToken?: boolean,
  /** The Twitch API url. Defaults to "https://api.twitch.tv/" */
  apiURL?: string,
  /** The Twitch authentication url. Defaults to "https://id.twitch.tv/" */
  authURL?: string
}

interface APIOptions {
  clientID: string | null,
  clientSecret: string | null,
  redirectURL: string | null,
  refreshToken: string | null,
  accessToken: string | null,
  autoRefreshToken: boolean,
  validateToken: boolean,
  apiURL: string,
  authURL: string
}

type RequestCallback = (err: any, data?: {} | any, res?: request.Response, body?: any) => void;

interface RequestOptionsMethod extends RequestOptions {
  method: 'GET' | 'POST' | 'DELETE' | 'PUT' | 'HEAD'
}

interface RequestOptions {
  /** The API endpoint. Example: "streams" */
  url: string,
  /** The base URL to use. Defaults to constructor option apiURL */
  baseURL?: string,
  /** Replacement clientID, use null to not set. Defaults to constructor option clientID */
  clientID?: string,
  /** Replacement accessToken, use null to not set. Defaults to constructor option accessToken */
  accessToken?: string,
  /** The access token prefix. Defaults to "OAuth" for kraken calls and "Bearer" for other */
  accessTokenPrefix?: string,
}

class DebugLog {
  emitter: ExpandedEventEmitter;
  constructor() {
    this.emitter = new ExpandedEventEmitter();
  }
  log(...args: any[]): void {
    this.emitter.emit('log', args);
  }
  on(callback: (...args: any[]) => void): void {
    this.emitter.on('log', callback);
  }
}

interface TwitchAPI {
  addListener(event: string, listener: (...args: any[]) => void): this;
  /** When an error has happened */
  addListener(event: 'error', listener: (error: any) => void): this;
  /** When a debug message happens */
  addListener(event: 'debug', listener: (...message: any) => void): this;
  /** When the access token has been validated */
  addListener(event: 'tokenvalidate', listener: (data: any) => void): this;
  /** When the access token has been refreshed */
  addListener(event: 'tokenrefresh', listener: (data: any) => void): this;
  
  on(event: string, listener: (...args: any[]) => void): this;
  /** When an error has happened */
  on(event: 'error', listener: (error: any) => void): this;
  /** When a debug message happens */
  on(event: 'debug', listener: (...message: any) => void): this;
  /** When the access token has been validated */
  on(event: 'tokenvalidate', listener: (data: any) => void): this;
  /** When the access token has been refreshed */
  on(event: 'tokenrefresh', listener: (data: any) => void): this;

  once(event: string, listener: (...args: any[]) => void): this;
  /** When an error has happened */
  once(event: 'error', listener: (error: any) => void): this;
  /** When a debug message happens */
  once(event: 'debug', listener: (...message: any) => void): this;
  /** When the access token has been validated */
  once(event: 'tokenvalidate', listener: (data: any) => void): this;
  /** When the access token has been refreshed */
  once(event: 'tokenrefresh', listener: (data: any) => void): this;
  
  emit(event: string, ...args: any[]): boolean;
  emit(event: 'error', error: any): boolean;
  emit(event: 'debug', ...message: any): boolean;
  emit(event: 'tokenvalidate', data: any): boolean;
  emit(event: 'tokenrefresh', data: any): boolean;
}

class TwitchAPI extends ExpandedEventEmitter {
  options: APIOptions;
  tokenData: any;

  constructor(options?: APIOptionsParam) {
    super();
    this.options = {
      clientID: null,
      clientSecret: null,
      redirectURL: null,
      refreshToken: null,
      accessToken: null,
      autoRefreshToken: true,
      validateToken: true,
      apiURL: 'https://api.twitch.tv/',
      authURL: 'https://id.twitch.tv/'
    };
    if (options) {
      for (const key in options) {
        if (this.options.hasOwnProperty(key)) {
          this.options[key] = options[key];
        }
      }
    }
    if (this.options.validateToken) {
      this.validateAccessToken();
    }
  }

  private _getAuthHeaders(options: RequestOptions, callback: (err: any, headers?: {}) => void, recursive?: boolean): void {
    let { clientID, clientSecret, refreshToken, accessToken, autoRefreshToken } = this.options;
    if (options.clientID !== undefined) clientID = options.clientID;
    if (options.accessToken !== undefined) accessToken = options.accessToken;
    const headers = {};
    if (clientID !== null) {
      headers['Client-ID'] = clientID;
    }
    // We need to find out if we are using Twitch API v5 or new Twitch API
    // since it defines how the Authorization header should be set and accept header
    if (options.url.startsWith('/')) options.url = options.url.substring(1);
    const oldAPI = options.url.startsWith('kraken');
    if (oldAPI) {
      // We expect it to be Twitch API v5
      this.emit('debug', 'Using Twitch API v5 Authorization');
      headers['Accept'] = 'application/vnd.twitchtv.v5+json';
    } else {
      // We expect it to be new Twitch API
      this.emit('debug', 'Using new Twitch API Authorization');
    }
    if (accessToken !== null) {
      if (options.accessTokenPrefix !== undefined) {
        headers['Authorization'] = `${options.accessTokenPrefix} ${accessToken}`;
      } else {
        if (oldAPI) {
          headers['Authorization'] = 'OAuth ' + accessToken;
        } else {
          headers['Authorization'] = 'Bearer ' + accessToken;
        }
      }
    } else if (autoRefreshToken && refreshToken !== null && options.accessToken === undefined) {
      // We don't have an accessToken, but we do have a refresh token.
      // And the accessToken is not custom for this request.
      // So we use the refresh token to generate a new access token.
      if (
        !recursive && // If it's a recursive call, don't try to refresh token again
        this.options.clientID !== null && clientSecret !== null // And we have nessecary data to refresh token
      ) {
        this.emit('debug', 'Getting new access token from refresh token');
        this.refreshAccessToken((err) => {
          if (err) return callback(err);
          this._getAuthHeaders(options, callback, true);
        });
        return; // We don't want to keep on going here
      }
    }
    callback(null, headers);
  }

  private _jsonTwitchBody(res: request.Response, body: any, callback?: RequestCallback): void {
    if (!callback) return;
    try {
      const data = JSON.parse(body);
      if (Math.floor(res.statusCode / 100) !== 2) {
        callback(data, null, res, body);
      } else {
        callback(null, data, res, body);
      }
    } catch (e) {
      callback({
        error: 'Invalid JSON',
        message: 'Body could not be parsed as JSON'
      }, null, res, body);
    }
  }

  /**
   * Will refresh the internal access token.
   * Requires clientID, clientSecret and refreshToken in constructor options.
   * @param callback Callback for when the access token has been refreshed
   */
  refreshAccessToken(callback?: (err: any) => void): void {
    const { clientID, clientSecret, refreshToken, authURL } = this.options;
    if (clientID === null) return callback(new Error('Missing clientID'));
    if (clientSecret === null) return callback(new Error('Missing clientSecret'));
    if (refreshToken === null) return callback(new Error('Missing refreshToken'));
    const url = `${authURL}oauth2/token?grant_type=refresh_token&refresh_token=${refreshToken}&client_id=${clientID}&client_secret=${clientSecret}`;
    request({
      method: 'POST',
      url: url
    }, (err, res, body) => {
      if (err) {
        if (callback) callback(err);
        else this.emit('error', {
          error: 'Error refreshing access token',
          message: err
        });
        return;
      }
      this._jsonTwitchBody(res, body, (err, data) => {
        if (err) {
          if (callback) callback(err);
          else this.emit('error', {
            error: 'Error refreshing access token',
            message: err
          });
          return;
        }
        if (data.access_token) {
          this.options.accessToken = data.access_token;
          if (callback) callback(null);
          this.emit('tokenrefresh', data);
        } else {
          err = {
            error: 'Invalid refresh token',
            message: 'Could not get new access token from given refresh token'
          };
          if (callback) callback(err);
          else this.emit('error', err);
        }
      });
    });
  }

  request(options: RequestOptionsMethod, callback?: RequestCallback, recursive?: boolean): void {
    this._getAuthHeaders(options, (err, headers) => {
      if (err) return callback(err);
      this.emit('debug', 'Starting request', {
        options: options,
        headers: headers
      });
      request({
        method: options.method,
        baseUrl: options.baseURL || this.options.apiURL,
        url: options.url,
        headers: headers
      }, (err, res, body) => {
        if (err) {
          if (callback) callback(err, null, res, body);
          return;
        }
        this._jsonTwitchBody(res, body, (err, data, res, body) => {
          if (!recursive && this.options.accessToken !== null && err && err.status === 401) {
            this.emit('debug', 'Unauthorized request. Clearing accessToken and trying again.');
            this.options.accessToken = null;
            this.request(options, callback, true);
            return;
          }
          if (callback) callback(err, data, res, body);
        });
      });
    });
  }

  /**
   * Runs an oauth validate access token from Twitch
   * @param callback The callback for the Twitch data sent back
   */
  validateAccessToken(callback?: (err: any, data?: any) => void): void {
    this.request({
      method: 'GET',
      url: 'oauth2/validate',
      baseURL: this.options.authURL,
      accessTokenPrefix: 'OAuth'
    }, (err, data, res, body) => {
      if (err) {
        if (callback) callback(err);
        else this.emit('error', {
          error: 'Error validating access token',
          message: err
        });
        return;
      }
      this.tokenData = data;
      if (callback) callback(null, data);
      else this.emit('tokenvalidate', data);
    });
  }

  get(urlOrOptions: any, callback?: RequestCallback): void {
    let opts: any;
    opts = { method: 'GET' };
    if (typeof urlOrOptions !== 'string') opts = Object.assign(opts, urlOrOptions);
    else opts.url = urlOrOptions;
    this.request(opts, callback);
  }

  post(urlOrOptions: any, callback?: RequestCallback): void {
    let opts: any;
    opts = { method: 'POST' };
    if (typeof urlOrOptions !== 'string') opts = Object.assign(opts, urlOrOptions);
    else opts.url = urlOrOptions;
    this.request(opts, callback);
  }

  delete(urlOrOptions: any, callback?: RequestCallback): void {
    let opts: any;
    opts = { method: 'DELETE' };
    if (typeof urlOrOptions !== 'string') opts = Object.assign(opts, urlOrOptions);
    else opts.url = urlOrOptions;
    this.request(opts, callback);
  }

  put(urlOrOptions: any, callback?: RequestCallback): void {
    let opts: any;
    opts = { method: 'PUT' };
    if (typeof urlOrOptions !== 'string') opts = Object.assign(opts, urlOrOptions);
    else opts.url = urlOrOptions;
    this.request(opts, callback);
  }

  /**
   * Get OAuth Authorization Code Flow url that clients need to login with.
   * Remember to add state query to the url.
   * Requires clientID and redirectURL in construction parameters
   * When the user has logged in, they will be redirected to:
   * https://<your registered redirect URI>/?code=<authorization code>
   * You can then use that code to get a refresh token with:
   * getRefreshToken(<authorization code>, callback..)
   * @param scopes List of scopes to be in authorization url
   */
  getAuthenticationURL(...scopes: string[]): string {
    const { clientID, redirectURL, authURL } = this.options;
    if (clientID === null) throw new Error('Missing clientID');
    if (redirectURL === null) throw new Error('Missing redirectURL');
    return `${authURL}oauth2/authorize?client_id=${clientID}&redirect_uri=${redirectURL}&response_type=code&scope=${scopes.join(' ')}`;
  }

  /**
   * Get a refresh token from an authorization process.
   * Use getAuthenticationURL() to get the url the user needs to login at.
   * @param authCode The authorization code gotten from redirect URL query
   * @param callback Callback for the information Twitch sends back
   */
  getRefreshToken(authCode: string, callback: RequestCallback): void {
    const { clientID, clientSecret, redirectURL, authURL } = this.options;
    this.request({
      method: 'POST',
      url: `oauth2/token?client_id=${clientID}&client_secret=${clientSecret}&code=${authCode}&grant_type=authorization_code&redirect_uri=${redirectURL}`,
      baseURL: authURL
    }, (err, data, res, body) => {
      if (err) return callback(err);
      callback(null, data, res, body);
    });
  }

}

export = TwitchAPI;