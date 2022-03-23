import { createServer } from "http";
import httpProxy from "http-proxy";
import config from "./config.json" assert { type: "json" };
import { buildClient } from "./client.mjs";
import { set, get } from "./kv-storage.mjs";
import { readFileSync } from "fs";

const ecweb = new EventTarget();

ecweb.set = set;
ecweb.get = get;

const { target, hostname, port, trackPath } = config;

for (const mod of config.modules) {
  const tool = await import(`./${mod}/index.mjs`);
  tool.default(ecweb);
}

const injectedScript = readFileSync("browser/track.js").toString().replace("TRACK_PATH", trackPath);
const sourcedScript = "console.log('ecweb script is sourced again')";

const proxy = httpProxy.createProxyServer();
proxy.on("proxyReq", function (proxyRes, req, res) {
  console.log(req.url);
  if (req.url === "/cdn-cgi/ecweb/s.js") {
    res.end(sourcedScript);
  } else if (req.url === trackPath) {
    req.fullUrl = target + req.url;
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      const event = new Event("event");
      event.payload = JSON.parse(data);
      event.client = buildClient(req, res);
      res.payload = {
        fetch: [],
        eval: [],
        return: undefined
      }
      ecweb.dispatchEvent(event);
      res.end(JSON.stringify(res.payload));
    });
  }
});

proxy.on("proxyRes", function (proxyRes, req, res) {
  req.fullUrl = target + req.url;
  if (req.url !== "/cdn-cgi/ecweb/s.js" && req.url !== trackPath) {
    const event = new Event("pageview");

    event.client = buildClient(req, res);
    ecweb.dispatchEvent(event);
    let body = [];
    proxyRes.on("data", function (chunk) {
      body.push(chunk);
    });
    proxyRes.on("end", function () {
      body = Buffer.concat(body).toString();
      console.log("res from proxied server:", body);
      res.end(
        body.replace("<head>", `<head><script>${injectedScript}</script>`)
      );
    });
  }
});

createServer(function (req, res) {
  proxy.web(req, res, {
    target,
    selfHandleResponse: true,
  });
}).listen(port, hostname);

console.info(`\n🚀 EC-Web is now proxying ${target} at http://${hostname}:${port}`)
