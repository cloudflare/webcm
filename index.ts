// some tool

const NAMESPACE="example"

onEvent(context) {
  fetch("https://example.com/collect")
  addCookie("bla", "blue", {options})
  clientFetch("https://example.com/collect")
  runJS("snippet.js") // or should we use import here?
}

onPageload(page, context) {
  page.replaceElement(".example-*", render("widget", {context})) // implement caching, allow whatever templating system
  page.insertStylesheet("style.css") // these assets should be precompiled
  if (context.system.cookies.example_loggedin)
    page.insertStylesheet("style-loggedin.css") // you can dynamicaly add more
  page.insertJS("index.js")
}

onLoad() {
  registerProxy("/api", "api.example.com")
  route("/ping", (request) => {
    return new Response(204)
  })
}

yourdomain.com/cdn-cgi/zaraz/example/api/hello -> api.example.com/hello

yourdomain.com/cdn-cgi/zaraz/example/ping -> 204

// still missing
// - some interaction with KV
// - neededVariables
// - caching
// - example of templating systems
// 
// concepts:
// - we should be agnostic about your framework, build whatever as long as it spits out to assets
// - we should offer networking - express like API
// - predefined methods for adding cookies, fetching, client fetching
// - communication with the browser would be over WebSockets, so onEvent is inherently async
// - should we use Event-based system
// - use webworker
// - this whole thing should be an npm package
