/**
 * expand css ability
 * analyse [@require id] syntax in comment to add file requires
 * analyse [url(xxx)] syntax to expand ptah
 */
'use strict';

var gutil = require('gulp-util');
var through = require('through2');
var PluginError = gutil.PluginError;

var pluginName = 'gulp-her-cssExpand';

function createError(file, err) {
  if (typeof err === 'string') {
    return new PluginError(pluginName, file.path + ': ' + err, {
      fileName: file.path,
      showStack: false
    });
  }

  var msg = err.message || err.msg || 'unspecified error';

  return new PluginError(pluginName, file.path + ': ' + msg, {
    fileName: file.path,
    lineNumber: err.line,
    stack: err.stack,
    showStack: false
  });
}

//analyse [@require id] syntax in comment
function analyseComment(comment, callback) {
  var reg = /(@require\s+)('[^']+'|"[^"]+"|[^\s;!@#%^&*()]+)/g;
  return comment.replace(reg, callback);
}


module.exports = function (opt) {

  var useHash = her.config.get('useHash');
  var useDomain = her.config.get('useDomain');

  function expand(file, encoding, callback) {

    if (file.isNull()) {
      return callback(null, file);
    }

    if (file.isStream()) {
      return callback(createError(file, 'Streaming not supported'));
    }
    //match [@require id] or [url(xxx)]
    var reg = /(\/\*[\s\S]*?(?:\*\/|$))|\burl\s*\(\s*("(?:[^\\"\r\n\f]|\\[\s\S])*"|'(?:[^\\'\n\r\f]|\\[\s\S])*'|[^)}\s]+)\s*\)|\bsrc\s*=\s*("(?:[^\\"\r\n\f]|\\[\s\S])*"|'(?:[^\\'\n\r\f]|\\[\s\S])*'|[^\s}]+)/g;

    var content = String(file.contents);

    content = content.replace(reg, function (m, comment, url, filter) {
      if (url) {
        m = 'url(' + getUrl(url, file) + ')';
      } else if (filter) {
        m = 'src=' + getUrl(filter, file);
      }
      else if (comment) {
        m = analyseComment(comment, function (all, prefix, value) {
          var dep = her.uri.getId(value, file.dirname).id;
          file.addRequire(dep);
          return prefix + dep;
        });
      }
      return m;
    });

    file.contents = new Buffer(content);

    callback(null, file);
  }

  function getUrl(str, file) {
    var ret;
    var info = her.uri(str, file.dirname);

    if (info.file && info.file.isFile()) {
      str = info.file.getUrl(useHash, useDomain);
      ret = info.quote + str + info.query + info.hash + info.quote;
    } else {
      ret = str;
    }

    return ret;
  }

  return through.obj(expand);
};
