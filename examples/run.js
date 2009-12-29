var sys = require("sys"),
    posix = require("posix");

var filename = process.ARGV[2];
var paras    = JSON.parse(process.ARGV[3] || "{}")

// The template Engine
var te = require("../lib/asyncEJS").Engine();

var template = te.template(filename);

var templateResponse = template(paras);

templateResponse.addListener("body", function (chunk) {
  sys.print(chunk);
});

templateResponse.addListener("complete", function () {
  sys.puts("COMPLETE")
});