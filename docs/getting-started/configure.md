---
sidebar_position: 3
---

# Configure your first MC

### Add GA to `webcm.config.ts`

Go to [GA's Managed Component](https://github.com/managed-components/google-analytics) GitHub repository

1. Open the file [manifest.json](https://github.com/managed-components/google-analytics/blob/main/manifest.json). Use the `namespace` value from `manifest.json` as the name of the component
2. Following the permissions in [manifest.json](https://github.com/managed-components/google-analytics/blob/main/manifest.json), grant all the permissions you want to grant to the component by adding them to the permissions array.
3. Follow the [README](https://github.com/managed-components/google-analytics/blob/main/README.md) file, the Tool Settings section, to find out all the possible settings

```json
  components: [
    {
      "name": "google-analytics",
      "settings": { "tid": "UA-000000-2" },
      "permissions": [
        "client_network_requests",
        "execute_unsafe_scripts",
      ],
    },
  ],
```

4. Done ✅
