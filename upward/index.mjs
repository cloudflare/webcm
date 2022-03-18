export default function (zaraz) {
  // ====== Subscribe to User-Configured Events ======
  zaraz.addEventListener("event", async (event) => {
    const { client, payload } = event;

    // event.data is event.payload.event_type
    payload.tid = client.get("upward_tid");
    const dataToSend = zaraz.utils.filterOutEmptyValues(payload); // TODO should we provide some simple `utils`? how do we deal with these?
    if (Object.keys(dataToSend).length) {
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
