# WebCM

WebCM is a proxy server implementation of a [Components Manager (CM)](EXPLAINER.md). It works independently from your existing HTTP server. By proxying your server, it can add endpoints, execute server-side code, manipulate responses and more. These capabilities allow for a very performant way to load Managed Components.

## Installation

To run WebCM you need to have Node version >= 18. You can then install all dependencies with `npm i`.

## Usage

1. Edit [config.json](tests/demo_config.json) to your preferences. Make sure to adjust the `target` key to point to your webserver.
2. Run `npm run dev`

## Read more

- See [EXPLAINER.md](EXPLAINER.md) for more information about Managed Components and how they work
- See [SPECS.md](SPECS.md) for more information about the APIs that WebCM is implementing
