---
title: Extensions overview
headline: Extensions overview (AsyncAPI)
description: Learn about Fern's AsyncAPI extensions for generating higher-quality SDKs
---

Fern supports a variety of AsyncAPI extensions that enhance your API specification and generate higher-quality SDKs. 

You can apply these extensions in two ways: by overlaying them in separate override files or by embedding them directly in your AsyncAPI specification. See [Overrides](/learn/api-definitions/asyncapi/overrides) for more information. 

## Available extensions

The table below shows all available extensions and links to detailed documentation for each one.

| Extension | Description |
| --- | --- |
| [`x-fern-ignore`](./ignoring-elements) | Skip reading specific operations, channels, or schemas |
| [`x-fern-examples`](./request-response-examples) | Provide additional examples for better SDK documentation |
| [`x-fern-server-name`](./server-names) | Specify custom names for servers |
| [`x-fern-availability`](./availability) | Mark features as available in specific SDK versions |
| [`x-fern-audiences`](./audiences) | Filter operations by audience |
| [`x-fern-sdk-method-name`](./method-names) | Customize SDK method names |

<Note title="Request a new extension">
    If there's an extension you want that doesn't already exist, file an [issue](https://github.com/fern-api/fern/issues/new) to start a discussion about it.
</Note>
