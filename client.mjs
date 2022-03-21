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
    set: (key, value) => {
      res.setHeader("set-cookie", `${key}=${value}`);
    },
    get: (key) => {
      return cookies[key];
    },
  };
};
