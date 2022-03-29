# EC-Web

EC-Web is a proxy-server implementation of an [External Components Manager (ECM)](EXPLAINER.md). It works independently your existing HTTP server. By proxying your server, it can add endpoints, execute server-side code, manipulate responses and more. These capabilities allow for a very performant way to load External Components.

## Installation

To run EC-Web you need to have Node version >= 17. You can then install all dependencies with `npm i`.

## Usage

1. Edit [config.json] to your preferences. Make sure to adjust the `target` key to point to your webserver.
1. Run `npm run dev`

## Read more

- See [EXPLAINER.md] for more information about External Components and how they work
- See [SPECS.md] for more information about the APIs that EC-Web is implementing