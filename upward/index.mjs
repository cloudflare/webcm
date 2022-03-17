export default function (zaraz) {
  // ====== Subscribe to User-Configured Events ======
  zaraz.addEventListener("event", async (event) => {
    const { context } = event;
    const { client } = context;

    // event.data is event.payload.event_type
    event.payload.tid = client.cookies.upward_tid;
    const dataToSend = zaraz.utils.filterOutEmptyValues(event.payload); // TODO should we provide some simple `utils`? how do we deal with these?
    if (Object.keys(dataToSend).length) {
      const params = new URLSearchParams(event.data).toString();
      fetch(`https://www.upward.net/search/u_convert.fsn?${params}`);
    }
  });

  // ====== Subscribe to Pageview Events ======
  zaraz.addEventListener("pageview", async (event) => {
    const { context, emitter } = event;
    const { client } = context; // TODO client is replacing the current system object? right?

    const tid = client.page.query.tid;
    if (emitter.type === "browser") {
      emitter.setCookie("upward_tid", tid, {
        Path: "/",
        Expires: "Fri, 31 Dec 2028 23:59:59 GMT",
      }); // TODO: what are the options, does this look ok?
    }
  });
}
