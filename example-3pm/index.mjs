//
// some tool
import "pug";

export default function (manager) {
  // map yourdomain.com/cdn-cgi/manager/example/api/hello -> api.example.com/hello
  manager.registerProxy("/api", "api.example.com");

  // make static assets available
  // TODO: how do we enforce smart loading of these assets?
  manager.serveStatic("/public", "public");

  // yourdomain.com/cdn-cgi/manager/example/ping -> 204
  manager.get("/ping", (request) => {
    return new Response(204);
  });

  // Register to user-configured events
  manager.addEventListener("event", async (event) => {
    const { context, emitter } = event;

    // Send server-side request
    fetch("https://example.com/collect", {
      method: "POST",
      data: {
        ip: context.system.device.ip,
        eventName: context.eventName,
      },
    });

    // Check that the emitter is a browser, not some API
    if (emitter.type === "browser") {
      emitter.setCookie("bla", "blue", { options }); // TODO: be specific to cookies, or just "store"? scope and expiration?
      emitter.fetch(
        `https://example.com/collectFromBrowser?dt=${system.page.title}`
      );
      emitter.eval("assets/snippet.js"); // TODO: actually `require`?
    }

    // TODO: Reserved event names? Pageview? SPA? LoadWidget?
  });

  // Register to Pageview events
  manager.addEventListener("pageview", async (event) => {
    const { context, emitter, page } = event;

    // Send server-side request
    fetch("https://crazyegg.com/collect", {
      method: "POST",
      data: {
        url: context.system.page.url.href,
        body: page.response.body,
      },
    });
  });

  // Register to provide an embed widget
  manager.addEventListener("embed", (event) => {
    const { element, emitter, context } = event; // TODO: an embed needs `page`?
    const color = element.attributes.darkTheme ? "light" : "dark";
    const tweetId = element.attributes.id;
    const tweet = manager.useCache(
      "tweet-" + tweetId,
      null,
      await(await fetch("https://api.twitter.com/tweet/" + tweetId)).json() // TODO: How do we make sure we don't slow the rendering?
    );

    element.render(
      manager.useCache(
        "widget",
        ["system.context.userAgent.ua"],
        pug.compile("templates/widget.pug", { context }) // Use your own templating system, output is cached
      )
    );

    element.applyStylesheet("assets/style.css"); // these assets should be precompiled
    if (context.system.cookies.userId)
      element.applyStylesheet("assets/style-loggedin.css"); // you can dynamicaly add more

    element.eval("index.js"); // TODO: restirct this JS to the element using iframe srcdoc?
  });

  // Register to DOM changes
  manager.addEventListener("DOMChange", async (event) => {
    const { context, emitter, change } = event;

    // Send server-side request
    fetch("https://example.com/record_dom_changes", {
      method: "POST",
      data: JSON.stringify(change),
    });
  });
}

//
//
// still missing
// - some interaction with KV
// - what do we do with SPA
// - neededVariables
// - caching
// - mobile SDK / HTTP API ?
// - standardize "event types"? should everything be an event type? "identify", "chat"
// - example of templating systems
//
// concepts:
// - embeds will use iframe srchtml
// - we should be agnostic about your framework, build whatever as long as it spits out to assets
// - we should offer networking - express like API
// - predefined methods for adding cookies, fetching, client fetching
// - communication with the browser would be over WebSockets, so onEvent is inherently async
// - should we use Event-based system
// - use webworker
// - this whole thing should be an npm package
//
//
//

// manager.registerEmbed(attributes) {
//   const color = attributes.darkTheme ? "light" : "dark"
//   const html = manager.useCache("blue", [""])
//   return html
// }
//
//
// // is there even such a thing as "pageload"?
// manager.addEventListener("pageload", async (context) => {
//   page.replaceElement(".manager-widget", render("widget", { context })); // implement caching, allow whatever templating system
//   page.insertStylesheet("style.css"); // these assets should be precompiled
//   if (context.system.cookies.example_loggedin)
//     page.insertStylesheet("style-loggedin.css"); // you can dynamicaly add more
//   page.insertJS("index.js");
// });
