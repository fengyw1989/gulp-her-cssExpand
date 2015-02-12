/**
 * expand css ability
 * analysis '@require xxx' from comment to add file requires
 * analysis 'url(xxx)' to expand ptah
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
  function expand(file, encoding, callback) {

    if (file.isNull()) {
      return callback(null, file);
    }

    if (file.isStream()) {
      return callback(createError(file, 'Streaming not supported'));
    }
    //match /*@require xxx*/ or url(xxx)
    var reg = /(\/\*[\s\S]*?(?:\*\/|$))|\burl\s*\(\s*("(?:[^\\"\r\n\f]|\\[\s\S])*"|'(?:[^\\'\n\r\f]|\\[\s\S])*'|[^)}\s]+)\s*\)/g;

    var content = String(file.contents);

    content = content.replace(reg, function (m, comment, url) {
      if (url) {
        var info = her.uri(url, file.dirname);
        var ret;
        if (info.file && info.file.isFile()) {
          url = info.file.getUrl();
          ret = info.quote + url + info.quote;
        } else {
          ret = url;
        }
        m = 'url(' + ret + ')';
      } else if (comment) {
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

  return through.obj(expand);
};
