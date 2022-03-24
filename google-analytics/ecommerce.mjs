const MULTI_PRODUCT_DETAILS = {
  pr: {
    pr: "price",
    id: "sku",
    ca: "category",
    nm: "name",
    br: "brand",
    qt: "quantity",
    va: "variant",
    ps: "position",
  },
};

const SINGLE_PRODUCT_DETAILS = {
  pr1pr: "__client.price",
  pr1id: "__client.sku",
  pr1ca: "__client.category",
  pr1nm: "__client.name",
  pr1br: "__client.brand",
  pr1ps: "__client.position",
  pr1qt: "__client.quantity",
  pr1va: "__client.variant",
};

const EVERYTHING_ELSE_GA = {
  ...SINGLE_PRODUCT_DETAILS,
  ...MULTI_PRODUCT_DETAILS,
  pal: "__client.list_id",
  cu: "__client.currency",
  cos: "__client.step",
  tr: ["__client.total", "__client.revenue"],
  tt: "__client.tax",
  ts: "__client.shipping",
};

const EEC_MAP = {
  // 'View Item List': { ea: 'view_item_list' }, // TODO - handle item lists
  "View Promotion": {
    ea: "view_promotion",
    promo1id: "__client.promotion_id",
    promo1nm: "__client.name",
    promo1cr: "__client.creative",
  },
  "View Refund": {
    ea: "view_refund",
  },
  "Product Clicked": {
    ea: "select_content",
    ec: "engagement",
    el: "product",
    pa: "click",
  },
  "Product Viewed": {
    ea: "view_item",
    ec: "engagement",
    pa: "detail",
  },
  "Product Added": {
    ea: "add_to_cart",
    pa: "add",
  },
  "Product Removed": {
    ea: "remove_from_cart",
    pa: "remove",
  },
  "Cart Viewed": {}, // TBC
  "Checkout Started": { ea: "begin_checkout", pa: "checkout" },
  "Checkout Step Viewed": {
    pa: "checkout",
    ea: "checkout_progress",
  },
  "Checkout Step Completed": {
    pa: "checkout",
    ea: "checkout_progress",
  },
  "Payment Info Entered": {
    pa: "checkout",
    ea: "checkout_progress",
  },
  "Order Completed": {
    ea: "purchase",
    pa: "purchase",
  },
  "Order Updated": {
    ea: "set_checkout_option",
    pa: "checkout_option",
  },
  "Order Refunded": {
    ea: "refund",
    pa: "refund",
  },
  "Order Cancelled": {}, // TBC
};

export const getEcommerceParams = ({ payload }) => {
  const requestBody = {};
  requestBody.ec = "ecommerce";
  requestBody.t = "event";

  if (EEC_MAP[payload.eventName]) {
    const eecPayload = {
      ...EEC_MAP[payload.eventName],
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
              requestBody[key + (index + 1) + suffix] = product[ctxMap[suffix]];
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

  return requestBody;
};
