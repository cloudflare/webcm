---
sidebar_position: 1
---

# Introduction

Managed Components need to be loaded by a Components Manager. [WebCM proxy](https://webcm.dev) is the open-source Components Manager, which serves as an implementation reference.

Components Managers implement the APIs that are used by Components. For example, they collect information about the user device, or client-side events, and they pass them to the Components. Components can then respond with different asks - make a network request, save client-side information, load a widget and more - and the Manager then acts upon these asks.

Components Managers can work in many different environments. While WebCM works as a proxy server, a Components Manager implementation can also be written client-side, in a Service Worker, HTTP Server, and even outside the WWW. They can be written as SDKs for mobile development, and can be used in desktop applications too. The only requirement is a JavaScript-capable environment to execute the Components code.

The configuration for Managed Components is also done through the Components Manager. It determines which Components to load, when, what permissions to give them, and what configuration should be passed to them.

Other Components Managers: [Cloudflare Zaraz](https://www.cloudflare.com/products/zaraz/)
