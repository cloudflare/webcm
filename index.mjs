import { createServer } from "http";
import httpProxy from "http-proxy";
import config from "./config.json" assert { type: "json" };
import { buildClient } from "./client.mjs";
import { set, get } from "./kv-storage.mjs";

const zaraz = new EventTarget();

zaraz.set = set;
zaraz.get = get;

const { target, hostname, port } = config;

for (const mod of config.modules) {
  const tool = await import(`./${mod}/index.mjs`);
  tool.default(zaraz);
}

const injectedScript = "console.log('Zaraz is in the house')";
const sourcedScript = "console.log('Zaraz script is sourced again')";

const proxy = httpProxy.createProxyServer();
proxy.on("proxyReq", function (proxyRes, req, res) {
  console.log(req.url);
  if (req.url === "/cdn-cgi/zaraz/s.js") {
    res.end(sourcedScript);
  } else if (req.url === "/cdn-cgi/zaraz/t") {
    req.fullUrl = target + req.url;
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      const event = new Event("event");
      event.payload = JSON.parse(data);
      event.client = buildClient(req, res);
      zaraz.dispatchEvent(event);
      res.end();
    });
  }
});

proxy.on("proxyRes", function (proxyRes, req, res) {
  req.fullUrl = target + req.url;
  if (req.url !== "/cdn-cgi/zaraz/s.js" && req.url !== "/cdn-cgi/zaraz/t") {
    const event = new Event("pageview");

    event.client = buildClient(req, res);
    zaraz.dispatchEvent(event);
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
