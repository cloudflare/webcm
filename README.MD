# Zaraz Tool Package

## Introduction
A Zaraz Tool Package is an NPM package that defines how a certain third-party tool works in a website. It contains all of the assets required for the tool to function, and it allows to tool to subscribe to different events, to update the DOM and to introduce server-logic.

Tools that provide a Zaraz Tool Package have a few important advantages over tools that don't:
- Same domain
- Integrated Consent Manager support
- Website-wide events system
- Server logic: They can provide same-domain server logic
- Server-side rendered widgets and embeds

Note: The Zaraz Tool Package format is still under active development, and new capabilities are added all the time. The format is meant to be open and not platform specific: vendors and website owners will be able to load a tool written in this format without using Cloudflare Zaraz.

## Concepts

The Zaraz Tool Package can be used with any compliant third-party manager. Example third-party managers are Cloudflare Zaraz and the open-source Zaraz Runtime.

It is the responsbility of the third-party manager to implement the Zaraz Tool Package APIs, and to provide an interface for website owners to set their settings or configure their events.

## Manifest
Every Zaraz Tool Package includes a `manifest.json` in addition to the normal NPM `package.json` file. The manifest file includes information that the third-party manager uses when presenting the tool to the website owners.

```json
{
  "name": "ExampleTool",
  "description": "ExampleTool is a great tool for X and Y!",
  "namespace": "example",
  "icon": "assets/icon.svg",
  "fields": {
    "accountId": {
      "displayName": "Account ID",
      "helpText":
        "You can find the ID in the top of the ExampleTool dashboard.",
      "displayWidget": "text",
      "validations": [
        {
          "required": true
        },
        {
          "type": "number"
        }
      ]
    }
  },
  "allowCustomFields": true,
  "permissions": [
    {
      "permission": "provideEmbed",
      "explanation": "ExampleTool provides an embed you can use in your website",
      "required": true
    },
    {
      "permission": "clientFetch",
      "explanation": "ExampleTool uses cookies to attribute sessions more accurately",
      "required": false
    }
  ]
}
```

| Field | Description |
|---|---|
| `name` | User facing name of the tool |
| `description` | User facing description of the tool |
| `namespace` | A namespace string that third-party manager should serve server-side endpoints for the tool |
| `icon` | Path to an SVG icon that will be displayed with the tool |
| `fields` | An object describing the fields the third-party manager should ask for when configuring an event for the tool |
| `allowCustomFields` | Whether or not users should be allowed to send custom fields to the tool |
| `permissions` | Array of permissions the tool requires for its operation |

## API Overview

### Server functionality

Zaraz provides a couple of methods that allow a tool to introduce server-side functionality:

#### registerProxy
Create a reverse proxy from some path to another server. It can be used in order to access the tool vendor servers without the browser needing to send a request to a different domain.

**Example**

```js
zaraz.registerProxy("/api", "api.example.com");
````
For a tool that uses the namespace `example`, the above code will map `domain.com/cdn-cgi/zaraz/example/api/*` to `api.example.com`. For example, a request to `domain.com/cdn-cgi/zaraz/example/api/hello` will be proxied, server-side, to `api.example.com/hello`.

#### serveStatic
Serve static assets.

**Example**

```js
zaraz.serveStatic("public", "assets");
```
The tool will provide a directory with it static assets under `public`, and it will be available under the same domain. In the above example, the tool's `public` directory will be exposed under `domain.com/cdn-cgi/zaraz/example/assets`.

#### route 
Define custom server-side logic. These will run without a proxy, making them faster and more reliable.

**Example**

```js
zaraz.route("/ping", (request) => {
  return new Response(204);
});
```

The above will map respond with a 204 code to all requests under `domain.com/cdn-cgi/zaraz/example/ping`.


### User Events 

Users can configure events using a site-wide [Events API](https://developers.cloudflare.com/zaraz/web-api), and then map these events to different tools. A tool can register to listen to events and then define the way it will be processed.

**Example**
```js
zaraz.addEventListener("event", async ({ context, emitter }) => {
    // Send server-side request
    fetch("https://example.com/collect", {
      method: "POST",
      data: {
        ip: context.system.device.ip,
        eventName: context.eventName,
      },
    });

    // Check that the emitter is a browser
    if (emitter.type === "browser") {
      emitter.setCookie("example-uuid", uuidv4());
      emitter.fetch(
        `https://example.com/collectFromBrowser?dt=${system.page.title}`
      );
    }
  });
```

In the above example, when the tool receives an event it will do multiple things: (1) Make a server-side post request to /collect endpoint, with the visitor IP and the event name. If the visitor is using a normal web browser (e.g. not using the mobile SDK), the tool will also set a cookie named `example-uuid` to a random UUIDv4 string, and it ask the browser to make a client-side fetch request with the page title.


### Embeds and Widgets

Tools can provide embeds (elements pre-placed by the website owner using a placeholder) and widgets (floating elements) through the Zaraz Tool Package. 


#### Embed support

To place an embed in the page, the website owner includes a placeholder `div` element. For example, a Twitter embed could look like this:

```html
<div 
  data-zaraz-embed="twitter-example" 
  data-dark-theme 
  data-tweet-id="1488098745438855172">
</div>
```

Inside the Zaraz Took Package, the embed will be defined like in this example:

```js
zaraz.registerEmbed("twitter-example", ({ element }) => {
  const color = element.attributes['dark-theme'] ? "light" : "dark";
  const tweetId = element.attributes['tweet-id'];
  const tweet = zaraz.useCache(
    "tweet-" + tweetId,
    await(await fetch("https://api.twitter.com/tweet/" + tweetId)).json()
  );

  element.render(
    zaraz.useCache(
      "widget",
      pug.compile("templates/widget.pug", { tweet, color })
    )
  );
});
```
In the above example, the tool defined an embed called `twitter-example`. It checks for some HTML attributes on the placeholder element, makes a request to a remote API, caches it, and then renders the new element instead the placeholder using the [Pug templating engine](https://pugjs.org/). Note the Pug templating system isn't a part of the Zaraz Package Tool - a tool can choose to use whatever templating engine it wants, as long as it responds with valid HTML code.

#### Widget support

Floating widgets are not replacing an element, instead, they are appended to the `<body>` tag of the page. Inside the Zaraz Took Package, a floating tweet widget will be defined like this:

```js
zaraz.registerWidget("floatingTweet", ({ element, settings }) => {
  const { tweetId } = settings
  const tweet = zaraz.useCache(
    "tweet-" + tweetId,
    await(await fetch("https://api.twitter.com/tweet/" + tweetId)).json()
  );

  element.render(
    zaraz.useCache(
      "widget",
      pug.compile("templates/floating-widget.pug", { tweet })
    )
  );
});
```
In the above example, the tool defined a widget called `floatingTweet`. It reads the tweet ID from the `settings` object, and then uses the same method as the embed to fetch from an API and render its HTML code.

