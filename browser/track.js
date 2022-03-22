const ec = {
  track: (payload) => {
    fetch('/cdn-cgi/zaraz/t', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }).then(res => res.json())
      .then(res => {
        console.log("Track response:", res)
        for (const f of res.fetch) fetch(f[0], f[1])
        for (const e of res.eval) eval(e)
      });
    }
}
