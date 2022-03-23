import ecommerce from "./ecommerce";
import gaDoubleClick from "./gaDoubleClick";
import getToolRequest from "./requestBuilder";

const _getFinalUrl = (rawParams) => {
  const params = new URLSearchParams(rawParams).toString();
  const baseURL = "https://www.google-analytics.com/collect?";
  const finalURL = baseURL + params;

  return finalURL;
};

/**
 * Google Analytics has the same behaviour for both Pageviews and User-Configured Events
 * This function will be used to handle both types of events
 * */
const _runTool = function (event, zaraz) {
  const { settings } = event;

  const rawParams = getToolRequest(event);
  const finalURL = _getFinalUrl(rawParams);

  fetch(finalURL);

  if (settings["ga-audiences"] || settings["ga-doubleclick"]) {
    gaDoubleClick(event, finalURL);
  }
};

export default function (zaraz) {
  // ====== Subscribe to User-Configured Events ======
  zaraz.addEventListener("event", async (event) => {
    _runTool(event, zaraz);
  });

  // ====== Subscribe to Pageview Events ======
  zaraz.addEventListener("pageview", async (event) => {
    _runTool(event, zaraz);
  });

  // ====== Subscribe to Ecommerce Events ======
  zaraz.addEventListener("ecommerce", async (event) => {
    const rawParams = getToolRequest(event);
    const ecommerceParams = ecommerce(event);
    const finalURL = _getFinalUrl({ ...rawParams, ...ecommerceParams });

    fetch(finalURL);

    //TODO  Do we need the Advertising features also here ??
  });
}
