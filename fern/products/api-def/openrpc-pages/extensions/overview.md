---
title: Extensions overview
headline: Extensions overview (OpenRPC)
description: OpenRPC extensions guide for Fern. Use x-fern-ignore, x-fern-examples, x-fern-availability, and more to improve SDK generation.
---

Fern supports a variety of OpenRPC extensions that enhance your API specification and generate higher-quality SDKs. 

You can apply these extensions in two ways: by overlaying them in separate override files or by embedding them directly in your OpenRPC specification. See [Overrides](/learn/api-definitions/openrpc/overrides) for more information. 

## Available extensions

The table below shows all available extensions and links to detailed documentation for each one.

| Extension | Description |
| --- | --- |
| [`x-fern-ignore`](./ignoring-elements) | Skip reading specific methods or schemas |
| [`x-fern-examples`](./request-response-examples) | Provide additional examples for better SDK documentation |
| [`x-fern-availability`](./availability) | Mark features as available in specific SDK versions |
| [`x-fern-server-name`](./server-names) | Specify custom names for servers |
| [`x-fern-sdk-group-name`](./sdk-group-names) | Group related methods in the SDK |
| [`x-fern-audiences`](./audiences) | Filter methods by audience |
| [`x-fern-sdk-method-name`](./method-names) | Customize SDK method names |

<Note title="Request a new extension">
    If there's an extension you want that doesn't already exist, file an [issue](https://github.com/fern-api/fern/issues/new) to start a discussion about it.
</Note>
