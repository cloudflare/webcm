const getRandomInt = () => Math.floor(2147483647 * Math.random());

export default getToolRequest = ({ client, payload, settings }) => {
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

  const rawParams = { ...requestBody, ...payload }; // TODO in old zaraz we appended event.data - I guess here we're appending the payload

  return rawParams;
};
