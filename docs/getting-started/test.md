---
sidebar_position: 5
---

# Test your setup

If WebCM is up and running and your website is proxied correctly, accessing `http://localhost:1337` will load a version of your website that will include a minimal WebCM script depending on the tools you've configured in `webcm.config.ts`. In order to test if WebCM was injected coorectly into your page, you can:

1. Search for `webcm` in the Page Source - if you can't find it, there's a chance:
   1. You're accessing your website directly and not via the proxy URL
   1. You didn't set your website as the target in `webcm.config.ts`
1. Try to run `webcm.track({ name: 'cheese', something: 'brie' })` from the browser's console and check the network tab for a `/track` request
1. If you're loading the demo component, you should see `/system` network requests on `mousemove`, `mousedown`, `mouseup`, `scroll` and logs on the server for each `/system` request
1. If you're loading the demo component, try calling `webcm.ecommerce('Purchase', { revenue: '123.99' })` from the browser's console
