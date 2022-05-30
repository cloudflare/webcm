# Managed Components Specification

This document details the specifications and capabilities of a Managed Component.

## Manifest

Every Managed Component includes a `manifest.json`. The manifest file includes information that the Components Manager uses when presenting the tool to the website owners.

```json
{
  "name": "ExampleTool",
  "description": "ExampleTool is a great tool for X and Y!",
  "namespace": "example",
  "icon": "assets/icon.svg",
  "fields": {
    "accountId": {
      "displayName": "Account ID",
      "helpText": "You can find the ID in the top of the ExampleTool dashboard.",
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

| Field               | Description                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------ |
| `name`              | User facing name of the tool                                                                                 |
| `description`       | User facing description of the tool                                                                          |
| `namespace`         | A namespace string that the Components Manager should serve server-side endpoints for the tool               |
| `icon`              | Path to an SVG icon that will be displayed with the tool                                                     |
| `fields`            | An object describing the fields the Components Manager should ask for when configuring an event for the tool |
| `allowCustomFields` | Whether or not users should be allowed to send custom fields to the tool                                     |
| `permissions`       | Array of permissions the tool requires for its operation                                                     |

### Permissions

The following table describes the permissions that a tool can ask for when being added to a website.

| Permission           | Required for                                                                |
| -------------------- | --------------------------------------------------------------------------- |
| client_kv            | `client.set`, `client.get`                                                  |
| client_ext_kv        | `client.get` when getting a key from another tool                           |
| run_client_js        | `client.execute`                                                            |
| client_fetch         | `client.fetch`                                                              |
| run_scoped_client_js |                                                                             |
| serve_static         | `serve`                                                                     |
| server_functions     | `proxy`, `route`                                                            |
| read_page            |                                                                             |
| provide_embed        | `provideEmbed`                                                              |
| provide_widget       | `provideWidget`                                                             |
| hook_user_events     | events: `event`                                                             |
| hook_browser_events  | events: `pageview`, `historyChange`, `DOMChange`, `click`, `scroll`, `time` |

---
## API Overview

### Structure

A Managed Component needs to export one default function that takes the Component Manager as an argument. The function is executed when the component is loaded. The component uses this function to listen to events and to register UI elements.

```js
export default async function (manager, settings) {
  // the Managed Component logic goes here
}
```

### Server functionality

External Components provides a couple of methods that allow a tool to introduce server-side functionality:

#### `proxy`

Create a reverse proxy from some path to another server. It can be used in order to access the tool vendor servers without the browser needing to send a request to a different domain.

```js
manager.proxy('/api', 'api.example.com')
```

For a tool that uses the namespace `example`, the above code will map `domain.com/cdn-cgi/zaraz/example/api/*` to `api.example.com`. For example, a request to `domain.com/cdn-cgi/zaraz/example/api/hello` will be proxied, server-side, to `api.example.com/hello`.

In the case of proxying static assets, you can use the third optional argument to force caching:

```js
manager.proxy('/assets', 'assets.example.com', { cache: 'always' })
```

The third argument is optional and defaults to:

```js
{
  cache: 'auto' // `never`, `always`, or `auto`. `auto` will cache based on the cache-control header of the responses.
}
```

#### `serve`

Serve static assets.

```js
manager.serve('public', 'assets')
```

The tool will provide a directory with it static assets under `public`, and it will be available under the same domain. In the above example, the tool's `public` directory will be exposed under `domain.com/cdn-cgi/zaraz/example/assets`.

#### `route`

Define custom server-side logic. These will run without a proxy, making them faster and more reliable.

```js
manager.route('/ping', request => {
  return new Response(204)
})
```

The above will map respond with a 204 code to all requests under `domain.com/cdn-cgi/zaraz/example/ping`.

### Events Overview

In a nutshell, manager events are listened to using `manager.addEventListener`, but each client event requires two steps:
  1. listener declaration using `manager.createEventListener`
  2. then linking to a client using `client.attachEvent`.

**Why?**

`manager.addEventListener` is used for all events originating from the manager itself, whereas `manager.createEventListener` is for events originating from the client.
This is an important difference because when your component is initialized, there are no clients (they only show up later, when visitors are visiting the website). This is why you don't have access to the `client` object in the top-most function of your component; it is only exposed inside the event handlers (e.g. `pageview` & `clientcreated`).
For client events, we're separating the declaration of the handler from its coupling to a client instance. `createEventListener` therefore declares the handler, but doesn't attach it to any client yet. When the `client` object is later exposed in one of the `manager` event handlers, you can use `client.attachEvent` to actually bind the aforementioned handler to the client.

### Manager Events

#### Pageview (`pageview`)

```js
manager.addEventListener('pageview', async event => {
  const { client } = event

  // Send server-side request
  fetch('https://example.com/collect', {
    method: 'POST',
    data: {
      url: client.url.href,
      title: client.title,
    },
  })
})
```

The above will send a server-side request to `example.com/collect` whenever the a new page loads, with the URL and the page title as payload.

#### Client Creation (`clientcreated`)

```js
manager.addEventListener('clientcreated', async event => {
  const { client } = event
  const num = Math.random()
  client.set('clientNumber', num.toString())
})
```

The above will store a random number variable to the client whenever a new client loads a page.

#### User-configured events (`event`)

Users can configure events using a site-wide [Events API](https://developers.cloudflare.com/zaraz/web-api), and then map these events to different tools. A tool can register to listen to events and then define the way it will be processed.

```js
manager.addEventListener('event', async ({ context, client }) => {
  // Send server-side request
  fetch('https://example.com/collect', {
    method: 'POST',
    data: {
      ip: context.system.device.ip,
      eventName: context.eventName,
    },
  })

  // Check that the client is a browser
  if (client.type === 'browser') {
    client.set('example-uuid', uuidv4())
    client.fetch(
      `https://example.com/collectFromBrowser?dt=${system.page.title}`
    )
  }
})
```

In the above example, when the tool receives an event it will do multiple things: (1) Make a server-side post request to /collect endpoint, with the visitor IP and the event name. If the visitor is using a normal web browser (e.g. not using the mobile SDK), the tool will also set a client key (e.g. cookie) named `example-uuid` to a random UUIDv4 string, and it ask the browser to make a client-side fetch request with the page title.

### Client Events

NOTE: Each of the below client events listeners are instantiated using `manager.createEventListener` and **enabled** by using `client.attachEvent`.

E.g.

```js
// earlier in the Managed Component:
manager.createEventListener('mousedown', async event => {
  console.info('🐁 ⬇️ Mousedown:', event.payload)
})

// later in the same component
manager.addEventListener('clientcreated', ({ client }) => {
  client.attachEvent('mousedown')
})
```

The above example establishes a `mousedown` event listener for each newly created client.
#### Single Page Application navigation

The `historyChange` event is called whenever the page changes in a Single Page Application, by mean of `history.pushState` or `history.replaceState`. Tools can automatically trigger an action when this event occurs using an Event Listener.

```js
manager.createEventListener('historyChange', async event => {
  const { client } = event

  // Send server-side request
  fetch('https://example.com/collect', {
    method: 'POST',
    data: {
      url: client.url.href,
      title: client.title,
    },
  })
})
```

The above will send a server-side request to `example.com/collect` whenever the page changes in a Single Page Application, with the URL and the page title as payload.

#### Scroll

```js
manager.createEventListener('scroll', async event => {
  console.info('They see me scrollin...they hatin...', event.payload)
})
```

#### Mouse move

```js
manager.createEventListener('mousemove', async event => {
  const { payload } = event
  console.info('🐁 🪤 Mousemove:', payload)
})
```

#### Mouse down

```js
manager.createEventListener('mousedown', async event => {
  // Save mouse coordinates as a cookie
  const { client, payload } = event
  console.info('🐁 ⬇️ Mousedown payload:', payload)
  const [firstClick] = payload.mousedown
  client.set('lastClickX', firstClick.clientX)
  client.set('lastClickY', firstClick.clientY)
})
```

#### Resize

```js
manager.createEventListener('resize', async event => {
  console.info('New window size!', event.payload)
})
```

#### Performance entries

```js
manager.createEventListener('performance', async event => {
  console.info('New performance entry!', event.payload)
})
```

### Embeds and Widgets

External Components can provide embeds (elements pre-placed by the website owner using a placeholder) and widgets (floating elements).

#### Embed support

To place an embed in the page, the website owner includes a placeholder `div` element. For example, a Twitter embed could look like this:

```html
<div
  data-component-embed="twitter-example"
  data-dark-theme
  data-tweet-id="1488098745438855172"
></div>
```

Inside the External Component, the embed will be defined like in this example:

```js
manager.registerEmbed("twitter-example", ({ element }) => {
  const color = element.attributes["dark-theme"] ? "light" : "dark";
  const tweetId = element.attributes["tweet-id"];
  const tweet = await manager.useCache(
    "tweet-" + tweetId,
    await(await fetch("https://api.twitter.com/tweet/" + tweetId)).json()
  );

  element.render(
    await manager.useCache(
      "widget",
      pug.compile("templates/widget.pug", { tweet, color })
    )
  );
});
```

In the above example, the tool defined an embed called `twitter-example`. It checks for some HTML attributes on the placeholder element, makes a request to a remote API, caches it, and then renders the new element instead the placeholder using the [Pug templating engine](https://pugjs.org/). Note the Pug templating system isn't a part of the External Component API - a tool can choose to use whatever templating engine it wants, as long as it responds with valid HTML code.

#### Widget support

Floating widgets are not replacing an element, instead, they are appended to the `<body>` tag of the page. Inside the External Component, a floating tweet widget will be defined like this:

```js
manager.registerWidget("floatingTweet", ({ element }) => {
  const tweetId = element.attributes["tweet-id"];
  const tweet = await manager.useCache(
    "tweet-" + tweetId,
    await(await fetch("https://api.twitter.com/tweet/" + tweetId)).json()
  );

  element.render(
    await manager.useCache(
      "widget",
      pug.compile("templates/floating-widget.pug", { tweet })
    )
  );
});
```

In the above example, the tool defined a widget called `floatingTweet`. It reads the tweet ID from the `settings` object, and then uses the same method as the embed to fetch from an API and render its HTML code.

### Storage

#### `set`

Save a variable to a KV storage.

```js
manager.set('message', 'hello world')
```

#### `get`

Get a variable from KV storage.

```js
const message = manager.get('message')
```

### Caching

#### `useCache`

The `useCache` method is used to provide tools with an abstract layer of caching that easy to use. The method takes 3 arguments - `name`, `function` and `expiry`. When used, `useCache` will use the data from the cache if it exists, and if the expiry time did not pass. If it cannot use the cache, `useCache` will run the function and cache it for next time.

```js
await manager.useCache(
  `widget-${tweet.id}`,
  pug.compile('templates/floating-widget.pug', { tweet }),
  60
)
```

In the above example the template will only be rerendered using Pug if the cache doesn't already have the rendered template saved, or if it has been more than 60 seconds since the time it was cached.

#### `invalidateCache`

Used when a tool needs to forcefully remove a cached item.

```js
manager.route('/invalidate', request => {
  manager.invalidateCache('some_cached_item')
  return new Response(204)
})
```

The above example can be used by a tool to remotely wipe a cached item, for example when it wants the website to re-fetch data from the tool vendor API.

---
### Clientside Functions

#### `client.fetch`

Make a `fetch` request from the client.

```js
client.fetch('https://example.com/collect')
```

The above will send a fetch request from the client to the resource specified.

#### `client.set`

Save a value on the client. In a normal web browser, this would translate into a cookie, or a localStorage/sessionStorage item.

```js
client.set('uuid', uuidv4(), { scope: 'infinite' })
```

The above will save a UUIDv4 string under a key called `uuid`, readable by this tool only. The Components Manager will know to attempt to make this key persist indefinitely.

The third argument is an optional object with these defaults:

```js
{
  "scope": "page", // "page", "session", "infinite"
  "expiry": null // `null`, Date object or lifetime in milliseconds
}
```

#### `client.get`

Get the value of a key that was set using `client.set`.

```js
client.get('uuid')
```

As keys are scoped to each tool, a tool can also explicitly ask for getting the value of a key from another tool:

```js
client.get('uuid', 'facebook-pixel')
```

#### `client.return`

Return a value to the client so that it can use it.

```js
manager.addEventListener('event', async ({ context, payload, client }) => {
  if (context.eventName === 'multiply') {
    client.return(context.x * context.y)
  }
})
```

On the browser, the website can access this result using:

```js
const value = await manager.track('multiply', { x: 21, y: 2 })
const result = value.return['exampleTool'] // = 42
```

#### `client.execute`

Run client-side JS code in the client.

```js
manager.addEventListener('event', async ({ context, payload, client }) => {
  client.execute("console.log('Hello World');")
})
```

This would make the browser print "Hello World" to the console.
