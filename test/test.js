var assert = require('assert'),
    sys = require("sys"),
    path = require('path'),
    fs = require("fs");

var reference = fs.readFileSync(path.join(__dirname, "fixtures/reference.html"))+"";

(function testRender() {

  var te = require("../lib/asyncEJS").Engine();

  te.template("fixtures/template.js.html", function (t1) {
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
        sys.puts("testRender: NOT OK");
        sys.puts("######## Original:\n"+reference);
        sys.puts("######## Output:\n"+body);
      }
    });
  })
  
})();

(function testTemplateRoot() {
  
  var te = require('../lib/asyncEJS').Engine({templateRoot: path.join(__dirname, 'fixtures')});
  te.template('template_root_test.js.html', function (template) {
    var templateResponse = template({ hello: [] });
    var body = ""
  
    templateResponse.addListener('body', function (c) { body += c; });
  
    process.addListener('exit', function () {
      assert.equal(body, reference);
      sys.puts('testTemplateRoot: passed');
    });
  });
})();
