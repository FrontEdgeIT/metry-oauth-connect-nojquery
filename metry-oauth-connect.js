// MetryoAuthConnect
// --------------
// Javascript class that makes it easy to connect with Metry's oAuth authentication
//

let MetryoAuthConnect = function MetryoAuthConnect(options) {
  this.BASE_URL = 'https://app.metry.io/';
  this.PATH_TOKEN = 'oauth/token';
  this.PATH_AUTHORIZE = 'oauth/authorize';

  this.authConfig = options;
  this.attachToButtons();
};

/**
 * Handle incoming Auth Codes
 * We should request an authorization_code now and set those in our localStorage
 *
 * @param code The code we got from the authentication window.
 */
MetryoAuthConnect.prototype.handleAuthCode = function handleAuthCode(code) {
  let that = this;
  let url = this.makeUrl([this.BASE_URL, this.PATH_TOKEN], {});
  let params = new FormData();
  params.append('grant_type','authorization_code');
  params.append('code', code);
  params.append('client_id',this.authConfig.clientId);
  params.append('client_secret',this.authConfig.clientSecret);
  params.append('state', '');
  params.append('scope',this.authConfig.scope || 'basic');
  params.append('redirect_uri',this.authConfig.redirectUri);

  fetch(url, {
    method: 'POST',
    body: params
  })
    .then(response => response.json())
    .then(data => {
      // onSuccess callback
      if (typeof that.authConfig.onSuccess === 'function') {

        that.authConfig.onSuccess(data);
      }

      // Trigger Metry::GotToken
      let event;
      if(window.CustomEvent){
        // If the browser complies to modern ECMA-script standards
        event = new CustomEvent('Metry:GotToken', {detail: data});
      } else {
        // If it does not
        event = document.createEvent('CustomEvent');
        event.initCustomEvent('Metry:GotToken', true, true, data);
      }

      document.dispatchEvent(event);
    })
    .catch(e => { console.log(e)});
};

/**
 * Fetch a new access token from the Refresh Token
 *
 * @param refreshToken The refresh token
 * @returns {*} This returns a promise containing the response as JSON data
 */
MetryoAuthConnect.prototype.fetchAccessToken = function fetchAccessToken(
  refreshToken
) {
  let params = new FormData();
  params.append('client_id',this.authConfig.clientId);
  params.append('client_secret',this.authConfig.clientSecret);
  params.append('grant_type','refresh_token');
  params.append('scope',this.authConfig.scope || 'basic');
  params.append('refresh_token',refreshToken);

  return fetch(this.makeUrl([this.BASE_URL, this.PATH_TOKEN]),
    {
      method: 'POST',
      body: params
    }).then(result => result.json());
};

/**
 * Get the Authorization URL for Metry's oAuth authorize URL
 * @returns {string}
 */
MetryoAuthConnect.prototype.authorizeUrl = function authorizeUrl() {
  let params = {
    client_secret: this.authConfig.clientSecret,
    client_id: this.authConfig.clientId,
    redirect_uri: this.authConfig.redirectUri,
    grant_type: 'authorization_code',
    response_type: 'code',
    state: 'emAuth',
    scope: this.authConfig.scope || 'basic'
  };

  return this.makeUrl([this.BASE_URL, this.PATH_AUTHORIZE], params);
};

/**
 * UI Integration
 * -------------------------
 * Methods that enables UI integration.
 */

/**
 * Open Authentication PopUp
 *
 * This function will open a new window with the Metry oAuth Authentication window.
 * It will listen to a change in the window and will try to obtain the 'code' parameter with the
 * oAuth token that we can use in 'handleAuthCode'.
 */
MetryoAuthConnect.prototype.openAuthenticatePopup = function openAuthenticatePopup() {
  let that = this;

  let authUrl = this.authorizeUrl();
  let features = this.getWindowFeatures(500, 700);
  let authWindow = window.open(authUrl, 'mryAuthWindow', features);

  let checkInterval = setInterval(function () {
    if (authWindow.closed) {
      return clearInterval(checkInterval);
    }

    try {
      let code = that.getParam('code', authWindow.document.URL);

      if (code) {
        clearInterval(checkInterval);
        authWindow.close();

        that.handleAuthCode(code);
      }
    } catch (e) { }
  }, 200);
};

/**
 * Attach to buttons
 *
 * This function will attach event listeners on buttons.
 * For example <a href="#" data-metry="authenticate">Connect</a>
 */
MetryoAuthConnect.prototype.attachToButtons = function attachToButtons() {
  let that = this; // Might be wrong

  document.addEventListener('click', (e) => {
    if(e.target.getAttribute('data-metry') === 'authenticate'){
      that.openAuthenticatePopup();
    }
  });
};

/**
 * Utilities
 * -------------------------
 * Helper functions for this Metry oAuth Connect library
 */

/**
 * Build a link based on components and parameters
 * @param components
 * @param params
 * @returns {string} Returns a URL
 */
MetryoAuthConnect.prototype.makeUrl = function makeUrl(components, params) {
  let fullPath = [];

  for (let i = 0, len = components.length; i < len; i++) {
    let component = components[i];

    if (component == null) {
      break;
    }

    fullPath.push(component.replace(/^\/|\/$/, ''));
  }

  let path = fullPath.join('/') + '?';

  if (typeof params === 'object') {
    for (let key in params) {
      let value = params[key];

      path += key + '=' + encodeURIComponent(value) + '&';
    }
  }

  return path.slice(0, -1);
};

/**
 * Get URL based parameters
 *
 * @param name
 * @param url
 * @returns {null}
 */
MetryoAuthConnect.prototype.getParam = function getParam(name, url) {
  name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
  let regexS = "[\\?&]" + name + "=([^&#]*)";
  let regex = new RegExp(regexS);
  let results = regex.exec(url);

  return results == null ? null : results[1];
};

/**
 * Get the window sizes used for opening a new window
 *
 * @param width
 * @param height
 * @returns {string}
 */
MetryoAuthConnect.prototype.getWindowFeatures = function getWindowFeatures(width, height) {
  let top = (window.screen.height - height) / 2;
  let left = (window.screen.width - width) / 2;

  return (
    'width=' + width +
    ',height=' + height +
    ',top=' + top +
    ',left=' + left +
    ',status=0,menubar=0,toolbar=0,personalbar=0'
  );
};

export default MetryoAuthConnect;
