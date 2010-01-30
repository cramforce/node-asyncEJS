var assert = require('assert'),
    sys = require("sys"),
    path = require('path'),
    posix = require("posix");

var reference = posix.cat(path.join(__dirname, "fixtures/reference.html")).wait();

(function testRender() {

  var te = require("../lib/asyncEJS").Engine();

  var t1 = te.template("fixtures/template.js.html");

  var templateResponse = t1({
    hello: []
  });
  var body = ""
  templateResponse.addListener("body", function (chunk) {
    body += chunk;
    sys.print(chunk);
  });

  templateResponse.addListener("complete", function () {
    if(body === reference) {
      sys.puts("testRender: OK");
    } else {
      sys.puts("testRender: NOT OK")
    }
  });
  
})();

(function testTemplateRoot() {
  
  var te = require('../lib/asyncEJS').Engine({templateRoot: path.join(__dirname, 'fixtures')});
  var template = te.template('template_root_test.js.html');
  var templateResponse = template({ hello: [] });
  var body = ""
  
  templateResponse.addListener('body', function (c) { body += c; });
  
  process.addListener('exit', function () {
    assert.equal(body, reference);
    sys.puts('testTemplateRoot: passed');
  });
  
})();
