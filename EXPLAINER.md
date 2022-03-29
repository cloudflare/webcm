# External Components

Today, when web developers want to add a third-party tool to their website, they usually add some JavaScript snippet that loads a remote resource. This can potentially be very problematic, for multiple reasons:

- **Performance**: It is slow. Every tool requires another network request, and much more than one. The code is then executed in the browser, which can block the main thread and slow down interacting with the website itself.
- **Security**: It is dangerous. The tool runs in the browser and so it has unlimited access to everything in the page. It can steal information, hijack the visitor or change the page in an undesired way.
- **Privacy**: Because the browser has to fetch all tools, every single vendor gets access to the visitor IP address and User Agent. It's impossible to prevent sending this information. Also, tools can collect information using JavaScript without any restrictions, and the web developer can do very little to restrict that.

An External Components is a JavaScript module that defines how a certain third-party tool works in a website. It contains all of the assets required for the tool to function, and it allows the tool to subscribe to different events, to update the DOM as well as to introduce server-side logic.

Tools that provide an External Component can earn from multiple capabilities:

- **Same domain**: Serve assets from the same domain as the website itself, for faster and more secure execution
- **Website-wide events system**: Hook to a pre-existing events system that the website uses for tracking events - no need to define tool specific API
- **Server logic**: Provide server-side logic on the same domain as the website, including proxying a different server, serving static assets or generating dynamic responses, reducing the load on the tool's servers
- **Server-side rendered widgets and embeds**: Easily extend the capabilities of the website with widgets and embeds that are performant and secure
- **Reliable client events**: Subscribe to client-side events in a cross-platform reliable way
- **Pre-Page-Rendering Actions**: Run server-side actions that read or write a website page, before the browser started rendering it
- **Integrated Consent Manager support**: Easier integration in a consent-aware environment

For more information about how to write and External Component, see:
- [SPECS.md]
- [Example Component](example-3pm/index.mjs)

## External Components Manager

External Components needs to be loaded by an External Components Manager (ECM). Example ECMs are Cloudflare Zaraz and the open-source [EC-Web proxy](README.md), which serves as an implementation reference.

ECMs implements the APIs that are used by EC modules. For example, they collect information about the user device, or client-side events, and they pass them to the the modules. Modules can then respond with different asks - make a network request, save client-side information, load a widget and more - and the ECM then acts upon these asks.

ECMs can work in many different environments. While EC-Web works as a proxy-server, a complete ECM implementation can also be written client-side, in a Web Worker, Service Worker, HTTP Server, and even outside the WWW. ECMs can be written as SDKs for mobile development, and can be used in desktop applications too. The only requirement is a JavaScript-capable environment to execute the modules code.

The configuration for EC modules is also done through the ECM. It determines which modules to load, when, what permissions to give them, and what configuration should be passed to them.