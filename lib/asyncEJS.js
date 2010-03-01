var path  = require('path'),
    fs    = require('fs'),
    sys   = require('sys');

function Promise() {
  this.cbs = [];
  this.errbs = [];
}

Promise.prototype = {
  addCallback: function (cb) {
    this.cbs.push(cb);
  },
  addErrback: function (errb) {
    this.errbs.push(errb)
  },
  emitSuccess: function () {
    for(var i = 0, len = this.cbs.length; i < len; ++i) {
      var cb = this.cbs[i];
      cb.apply(this, arguments);
    }
  },
  emitError: function (err) {
    var called = false;
    for(var i = 0, len = this.errbs.length; i < len; ++i) {
      var cb = this.errbs[i];
      cb.call(this, err);
      called = true;
    }
    if(!called) {
      throw(err)
    }
  }
}

var templateCache = {};

// A TemplateEngine holds template factories
// plus a config for all templates
var TemplateEngine = function (config) {
  config = config || {};
  this.autoUpdate = config.autoUpdate;
  this.templateRoot = typeof config.templateRoot === 'undefined' ?
                        process.cwd() : config.templateRoot;
}

exports.Engine = function (config) {
  return new TemplateEngine(config);
}

TemplateEngine.prototype = {
  
  // template constructor with a callback parameter
  template: function (filename, cb) {
    this.templateAsync(filename).addCallback(cb);
  },

  // Asynchronous template constructor
  // Returns a promise for a template
  templateAsync: function (filename) {
    var self = this;
    var templatePromise = new Promise();

    if (filename.charAt(0) !== '/') {
      filename = path.join(this.templateRoot, filename);
    }

    if(templateCache[filename]) {
      setTimeout(function () {
        templatePromise.emitSuccess(templateCache[filename]);
      }, 0);
      return templatePromise;
    }
  
    load(filename, function (fn) {
  
      var t = function (ctx) {
        var res = new TemplateResponse(self, filename);
        fn(ctx, res);
        setTimeout(function () {
          res.partFinished();
        }, 0)
        return res;
      };
    
      templateCache[filename] = t;
    
      if(self.autoUpdate) {
        process.watchFile(filename, {
            persistent: true,
            interval: 2000
        }, function () {
          load(filename, function (newFn) {
            fn = newFn;
          })
        });
      }
    
      templatePromise.emitSuccess(t);
    }, function (e) {
      templatePromise.emitError(e)
    });
    return templatePromise;
  },
  
  // Should not be public :)
  partial: function (filename, res, ctx) {
    var partialPromise = new Promise();
    var p = this.templateAsync(filename);
  
    var partRes;
  
    if(res) {
      res.schedule(function (res) {
        partRes = res;
      })
    }
  
    p.addCallback(function (t) {
      var partialResponse = t(ctx);
      //sys.puts("Partial "+partialResponse.filename)
      partialResponse.addListener("body", function (chunk) {
        //sys.puts("PartialChunk"+partialResponse.filename)
        partRes.print(chunk);
      });
      partialResponse.addListener("complete", function () {
        //sys.error("Partial done "+partialResponse.filename);
        partialResponse.finished = true;
        partRes.finish();
        res.partFinished();
        partialPromise.emitSuccess();
      });
    })
    return partialPromise;
  }
};

function load(filename, cb, errb) {
  fs.readFile(filename, function (err, str) {
    if (err) throw err;
    
    var src = parseAndGenerate(str);
    
    //sys.puts(src);
    var fn = process.compile(src, filename);
    cb(fn);
  });
}


function TemplateResponse(engine, filename) {
  var self = this;
  process.EventEmitter.call(this);
  this.engine     = engine;
  this.filename   = filename;
  this.p          = [];
  this.returned   = 0;
  this.finished   = false;
}

process.inherits(TemplateResponse, process.EventEmitter);
process.mixin(TemplateResponse.prototype, {
  print: function () {
    this.p.push.apply(this.p, arguments);
  },
  
  toString: function () {
    return "<a TemplateResponse for "+this.filename+" "+this.finished+">"
  },
  
  finish: function () {
    this.emit("complete");
  },
  
  schedule: function (fn) {
    var part = this._schedule(fn);
    this.p.push(part);
  },
  
  _schedule: function (fn) {
    var self = this;
    var part = new TemplateResponse(this.engine, this.filename+"->async");
    part.addListener("complete", function () {
      part.finished = true;
      self.partFinished();
    })
    fn.call(part, part);
    return part;
  },
  
  partial: function (filename, ctx) {
    return this.engine.partial(filename, this, ctx);
  },
  
  partFinished: function () {
    var self = this;
    if(this.returned < this.p.length) {
      var done = this._partFinished(function (chunk) {
        self.emit("body", chunk);
        //sys.error("EMIT "+self.filename+" -> "+JSON.stringify(chunk))
      });
    
      if(done === this.p.length) {
        this.emit("complete");
      }
    }
  },
  
  _partFinished: function (cb, start) {
    var p = this.p;
    //sys.puts(this.filename + " -> "+JSON.stringify(this.p))
    if(start != null) {
      this.returned = start
    }
    for(var i = this.returned, len = p.length; i < len; ++i) {
      var part = p[i];
      if(!(part instanceof TemplateResponse)) {
        cb(part);
        this.returned++;
      }
      else if(part.finished) {
        part._partFinished(cb, 0)
        this.returned++;
      } else {
        break;
      }
    }
    return i;
  }
});

function parseAndGenerate(str) {
  var open   = "<%";
  var close  = "%>";
  var index;
  var dynPart = [];
  // TODO tweak the second replace so that the first can go away (and the later which reverse it)
  var staticParts = str.replace(/[\n\r]/g, "<;;;;>").replace(/<%(.*?)%>/g, function (part, code) {
    dynPart.push(code.replace(/<;;;;>/g, "\n"));
    return "<%%>"
  }).replace(/<;;;;>/g, "\n").replace(/'/g, "\\'").replace(/[\n\r]/g, "\\n\\\n").split(/<%%>/);
  
  var src = 'function __template__ (ctx, res) {';
  
  src = staticParts.reduce(function(src, part, index){
    src = src + "res.p.push('" + part + "');";
    var code = dynPart[index];
    if(code != null) {
      if(code.charAt(0) === "=") {
        code = code.substr(1);
        src = src + "res.p.push("+code+");";
      }
      else if(code.charAt(0) === "?") {
        code = code.substr(1);
        src = src + "res.p.push(res._schedule(function (res) {"+code+"}));"
      }
      else {
        src = src + code
      }
    }
    return src;
  }, src) + "return res}__template__;";
  return src;
}

function parseJohnResig(str) {
  // Stolen from underscore.js http://documentcloud.github.com/underscore/underscore.js
  // JavaScript templating a-la ERB, pilfered from John Resig's
  // "Secrets of the JavaScript Ninja", page 83.
  var src =
    'function __template__ (ctx, res) {' +
    'res.p.push(\'' +
    str
      .replace(/[\t]/g, " ")
      .replace(/[\n\r]/g, "<%\n%>\\n")
      .split("<%").join("\t")
      .replace(/((^|%>)[^\t]*)'/g, "$1\n")
      .replace(/\t=(.*?)%>/g, "',$1,'")
      .replace(/\t\?(.*?)%>/g, "',res._schedule(function (res) {$1}),'")
      .split("\t").join("');")
      .split("%>").join("res.p.push('")
      .split("\r").join("\\'")
  + "');return res}__template__;";
  
  return src;
}

