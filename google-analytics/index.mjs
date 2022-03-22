import gaDoubleClick from "./gaDoubleClick";
import getToolRequest from "./requestBuilder";

/**
 * Google Analytics has the same behaviour for both Pageviews and User-Configured Events
 * This function will be used to handle both types of events
 * */

const _runTool = function (event, zaraz) {
  const { finalURL } = getToolRequest(event);
  gaDoubleClick(event, finalURL);
};

export default function (zaraz) {
  // ====== Subscribe to User-Configured Events ======
  zaraz.addEventListener("event", async (event) => {
    _runTool(event);
  });

  // ====== Subscribe to Pageview Events ======
  zaraz.addEventListener("pageview", async (event) => {
    _runTool(event);
  });
}
