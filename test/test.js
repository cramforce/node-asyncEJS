var sys = require("sys"),
    posix = require("posix");

var reference = posix.cat("fixtures/reference.html").wait();

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
    sys.puts("OK");
  } else {
    sys.puts("NOT OK")
  }
});