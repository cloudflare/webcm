const getRandomInt = () => Math.floor(2147483647 * Math.random());

export default getToolRequest = ({ client, payload }) => {
  const settings = {} // TODO where do we get the settings from?
  // TODO - create a requestBody type just for GA?
  const requestBody = {
    t: "pageview",
    v: 1,
    jid: getRandomInt(),
    gjid: getRandomInt(),
    z: getRandomInt(),
    sr: client.device.resolution,
    dt: client.page.title,
    ul: client.device.language,
    dl: client.page.url.href,
    ua: client.device.userAgent.ua,
    // TODO where do we take this value from? should it be serverSide settings?
    ...(settings?.hideOriginalIP && {
      uip: client.device.ip,
    }),
  };

  if (!client.device.viewport.includes("undefined")) {
    requestBody.vp = client.device.viewport;
  }

  if (client.page.referrer) {
    requestBody.dr = client.page.referrer;
  }

  if (client.get["_ga"]) {
    // This will leave our UUID as it is, but extract the right value from tha _ga cookie
    requestBody["cid"] = client.get["_ga"].split(".").slice(-2).join(".");
  } else {
    const uid = crypto.randomUUID();
    requestBody["cid"] = uid;
    client.set("_ga", uid, { scope: "infinite" });
  }

  if (client.get["_gid"]) {
    requestBody["gid"] = client.get["_gid"].split(".").slice(-2).join(".");
    requestBody["_gid"] = client.get["_gid"].split(".").slice(-2).join(".");
  }

  /* Start of gclid treating, taken from our Google Conversion Pixel implementation */
  if (client.page.query._gl) {
    try {
      const gclaw = atob(
        // because it's in a try-catch already
        // @ts-ignore
        client.page.query._gl.split("*").pop().replaceAll(".", "")
      );
      client.set("_gcl_aw", gclaw, { scope: "infinite" });
      requestBody.gclid = gclaw.split(".").pop();
    } catch (e) {
      console.log("Google Analytics: Error parsing gclaw", e);
    }
  }
  if (client.get["_gcl_aw"]) {
    requestBody.gclid = client.get["_gcl_aw"].split(".").pop();
  }
  if (client.get["gclid"]) {
    requestBody.gclid = client.get["gclid"];
  }
  /* End of gclid treating */
  if (requestBody.gclid) {
    const url = new URL(requestBody.dl);
    url.searchParams.get("gclid") ||
      url.searchParams.append("gclid", requestBody.gclid); // If DL doesn't have gclid in it, add it
    requestBody.dl = url;
  }

  if (client.page.query.utma) {
    client.set("_utma", system.page.query.utma, {
      scope: "infinite",
    });
  }
  if (client.page.query.utmz) {
    client.set("_utmz", system.page.query.utmz, {
      scope: "infinite",
    });
  }
  if (client.page.query.dpd) {
    client.set("_dpd", system.page.query.dpd, {
      scope: "infinite",
    });
  }
  if (client.page.query.utm_wtk) {
    client.set("utm_wtk", system.page.query.utm_wtk, {
      scope: "infinite",
    });
  }

  // TODO how do we deal with ecommerce? zarazTrack. zarazEcommerce don't exist
  if (payload.__zarazEcommerce === true) {
    requestBody.ec = "ecommerce";
    requestBody.t = "event";

    if (EEC_MAP[payload.__zarazTrack]) {
      const eecPayload = {
        ...EEC_MAP[payload.__zarazTrack],
        ...EVERYTHING_ELSE_GA,
      };
      for (const key of Object.keys(eecPayload)) {
        const ctxMap = eecPayload[key];
        if (Array.isArray(ctxMap)) {
          // competing possible dynamic values, override them in order
          for (const possibleVal of ctxMap) {
            if (clpayloadient[possibleVal.substr(9)]) {
              requestBody[key] = payload[possibleVal.substr(9)];
            }
          }
        } else if (typeof ctxMap === "object") {
          // must be products
          for (const [index, product] of (payload?.products || []).entries()) {
            for (const suffix of Object.keys(ctxMap)) {
              if (product[ctxMap[suffix]]) {
                requestBody[key + (index + 1) + suffix] =
                  product[ctxMap[suffix]];
              }
            }
          }
        } else if (ctxMap.startsWith("__client.")) {
          if (payload[ctxMap.substr(9)])
            requestBody[key] = payload[ctxMap.substr(9)];
        } else {
          requestBody[key] = ctxMap;
        }
      }
    }
  }

  const rawParams = { ...requestBody }; // TODO in old zaraz we appended event.data - I guess requestBody is enough here since we don't have any eventData. Double check :)
  const params = new URLSearchParams(rawParams).toString();
  const baseURL = "https://www.google-analytics.com/collect?";
  const finalURL = baseURL + params;
  return { _clientJS: clientJS, finalURL, rawParams };
};
