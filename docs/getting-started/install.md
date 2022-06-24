---
sidebar_position: 2
---

# Proxy your website

> 💡 **Prerequisite:** WebCM needs Node version >= 18. You can then install all dependencies with `npm i`.

To proxy your website through WebCM, add your website to the target property of `webcm.config.ts` before running WebCM.

### Run WebCM using `npx`

1. Create a `webcm.config.ts` config file (use [example.config.ts](https://github.com/cloudflare/webcm/blob/unstable/example.config.ts) as an example)
2. Run `npx webcm --c=webcm.config.ts --mc=./components`
3. WebCM will automatically download the [Managed Components](https://managedcomponents.dev/components) you specified and start the server

### Develop

1. `git clone git@github.com:cloudflare/webcm.git && cd webcm && npm i`
2. Create a `webcm.config.ts` config file (use [example.config.ts](https://github.com/cloudflare/webcm/blob/unstable/example.config.ts) as an example)
3. Run `npm run dev`
