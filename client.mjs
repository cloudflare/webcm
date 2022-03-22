const parseCookies = (cookieString) => {
  if (!cookieString) return {};
  return Object.fromEntries(
    cookieString
      .replaceAll("; ", ";")
      .split(";")
      .map((cookie) => cookie.split("="))
  );
};

export const buildClient = (req, res) => {
  const url = new URL(req.fullUrl);
  const cookies = parseCookies(req.headers["cookie"]);
  return {
    page: {
      query: Object.fromEntries(url.searchParams),
    },
    type: "browser",
    eval: (code) => {
      res.payload.eval.push(code);
    },
    return: (value) => {
      res.payload.return = value;
    },
    fetch: (resource, settings) => {
      res.payload.fetch.push([resource, settings]);
    },
    set: (key, value) => {
      res.setHeader("set-cookie", `${key}=${value}`);
    },
    get: (key) => {
      return cookies[key];
    },
  };
};
