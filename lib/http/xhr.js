var AWS = require('../core');
var EventEmitter = require('events').EventEmitter;
require('../http');

/**
 * @api private
 */
AWS.XHRClient = AWS.util.inherit({
  handleRequest: function handleRequest(httpRequest, httpOptions, callback, errCallback) {
    var self = this;
    var endpoint = httpRequest.endpoint;
    var emitter = new EventEmitter();
    var href = endpoint.protocol + '//' + endpoint.hostname;
    if (endpoint.port !== 80 && endpoint.port !== 443) {
      href += ':' + endpoint.port;
    }
    href += httpRequest.path;

    callback(emitter);

    // TODO: Handle httpOptions.xhrAsync !== false

    var hdrs = {}
    AWS.util.each(httpRequest.headers, function (key, value) {
      if (key !== 'Content-Length' && key !== 'User-Agent' && key !== 'Host') {
        hdrs[key] = value
      }
    });

    // TODO: Add timeout
    // if (httpOptions.timeout && httpOptions.xhrAsync !== false) {
    //     xhr.timeout = httpOptions.timeout;
    // }

    // TODO: Add credentials
    // if (httpOptions.xhrWithCredentials) {
    //     xhr.withCredentials = true;
    // }

    var f = new fetch(href, {method: httpRequest.method, headers: hdrs, body: httpRequest.body}).then(function(r) {
      // TODO: Hook up timeout
      // TODO: Hook up error handler
      r.text().then(function(d) {

        emitter.statusCode = r.status;
        // TODO: Pass response headers on
        emitter.headers = {}; // self.parseHeaders(xhr.getAllResponseHeaders());
        //for (var k in r.headers._headers) {
        //    console.log(i, k, r.headers.get(k), typeof r.headers.get(k));
        //    if (k.length > 0 && k != 'etag') emitter.headers[k.toLowerCase()] = r.headers.get(k);
        //}
        emitter.emit('headers', emitter.statusCode, emitter.headers);

        var buffer;
        try {
          if (!buffer && typeof d === 'string') {
            buffer = new AWS.util.Buffer(d);
          }
        } catch (e) {}

        if (buffer) emitter.emit('data', buffer);
        emitter.emit('end');
      });
    });

    return emitter;
  },

  parseHeaders: function parseHeaders(rawHeaders) {
    var headers = {};
    AWS.util.arrayEach(rawHeaders.split(/\r?\n/), function (line) {
      var key = line.split(':', 1)[0];
      var value = line.substring(key.length + 2);
      if (key.length > 0) headers[key.toLowerCase()] = value;
    });
    return headers;
  },

  finishRequest: function finishRequest(xhr, emitter) {
    var buffer;
    if (xhr.responseType === 'arraybuffer' && xhr.response) {
      var ab = xhr.response;
      buffer = new AWS.util.Buffer(ab.byteLength);
      var view = new Uint8Array(ab);
      for (var i = 0; i < buffer.length; ++i) {
        buffer[i] = view[i];
      }
    }

    try {
      if (!buffer && typeof xhr.responseText === 'string') {
        buffer = new AWS.util.Buffer(xhr.responseText);
      }
    } catch (e) {}

    if (buffer) emitter.emit('data', buffer);
    emitter.emit('end');
  }
});

/**
 * @api private
 */
AWS.HttpClient.prototype = AWS.XHRClient.prototype;

/**
 * @api private
 */
AWS.HttpClient.streamsApiVersion = 1;
