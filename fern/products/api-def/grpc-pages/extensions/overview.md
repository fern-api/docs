---
title: Overview of gRPC extensions
description: Learn about Fern's gRPC extensions for generating higher-quality SDKs
---

Fern supports a variety of gRPC extensions that enhance your API specification and generate higher-quality SDKs.

You can apply these extensions in two ways: by overlaying them in separate override files or by embedding them directly in your gRPC specification. See [Overrides](/api-definitions/overview/overrides) for more information. 

## Available extensions

The table below shows all available extensions and links to detailed documentation for each one.

| Extension | Description |
| --- | --- |
| [`x-fern-ignore`](./ignoring-elements) | Skip reading specific services, methods, or messages |
| [`x-fern-examples`](./request-response-examples) | Provide additional examples for better SDK documentation |
| [`x-fern-pagination`](./pagination) | Configure pagination for methods that return lists |
| [`x-fern-retry`](./retry-behavior) | Configure retry behavior for methods |
| [`x-fern-timeout`](./timeout-settings) | Configure timeout settings for methods |
| [`x-fern-error-handling`](./error-handling) | Configure error handling for methods |
| [`x-fern-availability`](./availability) | Mark features as available in specific SDK versions |
| [`x-fern-streaming`](./streaming-operations) | Mark methods as streaming for appropriate SDK generation |
| [`x-fern-server-name`](./server-names) | Specify custom names for different server environments |
| [`x-fern-base-path`](./base-path) | Configure base paths for generated SDK clients |
| [`x-fern-sdk-group-name`](./sdk-group-names) | Group related services in the SDK |
| [`x-fern-union-naming`](./union-naming) | Configure naming for oneof fields in SDKs |
| [`x-fern-validation`](./validation) | Add validation rules for message fields |

<Note title="Request a new extension">
    If there's an extension you want that doesn't already exist, file an [issue](https://github.com/fern-api/fern/issues/new) to start a discussion about it.
</Note>