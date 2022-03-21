export default function (zaraz) {
  // ====== Subscribe to User-Configured Events ======
  zaraz.addEventListener("event", async (event) => {
    const { client, payload } = event;

    payload.tid = client.get("upward_tid");

    for (let param in payload) {
      if (
        payload[param] === undefined ||
        payload[param] === null ||
        payload[param] === ""
      ) {
        delete payload[param];
      }
    }

    if (Object.keys(payload).length) {
      const params = new URLSearchParams(payload).toString();
      fetch(`https://www.upward.net/search/u_convert.fsn?${params}`);
    }
  });

  // ====== Subscribe to Pageview Events ======
  zaraz.addEventListener("pageview", async (event) => {
    const { client } = event;

    const tid = client.page.query.tid;
    if (client.type === "browser") {
      client.set("upward_tid", tid, {
        scope: "infinite",
      });
    }
  });
}
