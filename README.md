# 🧩 WebCM

WebCM is a proxy server implementation of a [Components Manager](https://managedcomponents.dev/getting-started/components-manager). It works independently from your existing HTTP server. By proxying your server, it can add endpoints, execute server-side code, manipulate responses and more. These capabilities allow for a very performant way to load Managed Components.

## Usage

> 💡 **Prerequisite:** To run WebCM you need to have Node version >= 18. You can then install all dependencies with `npm i`.

It's very easy to get up and running with WebCM using `npx`!

1. Create a `webcm.config.ts` config file (use [example.config.ts](./example.config.ts) as an example)
2. Run `npx webcm`
3. WebCM will automatically download the Managed Components you specified and start the server

## Develop

1. `git clone git@github.com:cloudflare/webcm.git && cd webcm && npm i`
2. Create a `webcm.config.ts` config file (use [example.config.ts](./example.config.ts) as an example)
3. Run `npm run dev`

## Build your own Managed Components

You might want to make WebCM load a locally developed Managed Component.

1. Place your Managed Component inside a `components` directory next to your config file
2. Edit your config file to include your component name in the `components` object

WebCM will now load your component. Use `webcm run dev` to get auto-reloading when your Managed Component changes.

## Read more

- See [managedcomponents.dev](https://managedcomponents.dev) for more information about Managed Components and how they work
- Check the [Managed Component Starter Template](https://github.com/managed-components/starter-template) for buildin your own Managed Component
