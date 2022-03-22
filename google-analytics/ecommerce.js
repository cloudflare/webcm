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
