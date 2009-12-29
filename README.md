# node-syncEJS - 0.0.1

> An asynchronous ERB-like templating system for node.js

node-asyncEJS implements a templating language for embedding JavaScript into
other text documents such as HTML. It adds new features to the classic ERB
syntax to enable asynchronous execution of the template.

## When to use
You can always use the synchronous features. So use it whenever you need a
templating solution.

The asynchronous features come in handy when you

1. want to flush the output to the client as early as possible
2. need to stream your generated content

## Usage

### Template

    <html>
      <head>
        <% ctx.hello = "World";  %>
        <title><%= "Hello " + ctx.hello %></title>
      </head>
      <body>

        <h1><%? setTimeout(function () { res.print("Async Header"); res.finish(); }, 2000)  %></h1>
        <p><%? setTimeout(function () { res.print("Body"); res.finish(); }, 1000)  %></p>

      </body>
    </html>
    
### JavaScript

    var te = require("../lib/asyncEJS").Engine();

    var template = te.template("template.t.html");

    var templateResponse = template(paras);

    templateResponse.addListener("body", function (chunk) {
      sys.print(chunk);
    });

    templateResponse.addListener("complete", function () {
      sys.puts("COMPLETE")
    });
    
## Templates

### Special Variables

`ctx` contains the parameter that was passed to the template function

`res` represents the output of the template.

`res.print("string")` prints more output into the template

`res.finish()` tells the template that the current asynchronous blocks has finished execution

### Basic Template Commands

`<% var javascript = "code" %>` executes arbitrary JavaScript

`<%= "Hello " + ctx.hello %>` outputs the statement result into the template

### Asynchronous Templates

    <%? setTimeout(function () { res.print("Async Header"); res.finish(); }, 2000)  %>

`<%?` introduces a block that will be expected to execute asynchronously with respect
to the rest of the template. The rest of the template will continue executing but no
output will be returned until the `res.finish()` method will be called.

### Partials

    <% res.partial("partial.js.html", { hello: "world" }); %>

`res.partial(filename, paras)

### Escaping

There is currently no escaping of output but this will change.

## JavaScript Usage

### Template Engine

Construct a template engine with

    var te = require("../lib/asyncEJS").Engine({
      autoUpdate: false
    });

If `autoUpdate` is true, asyncEJS will continously look for changes in templates and
automatically update them when they change on disk.

### Loading Templates

After you instantiated a template engine use the `template` method to create a template
function.

    var template = te.template("template.t.html");
  
Executing the template function with `paras` will return a templateResponse. The `paras` are
accessible as `ctx` variable inside the template.

    var templateResponse = template(paras);

### Template Responses

The template response emits two events `body` and `complete`

    templateResponse.addListener("body", function (chunk) {
      sys.print(chunk);
    });

    templateResponse.addListener("complete", function () {
      sys.puts("COMPLETE")
    });

`body` is emitted whenever a part of the template has been completed.

`complete` will fire once when the template has fully executed.

## Examples

See `examples/` and `test/`


