---
title: Extensions overview
headline: Extensions overview (OpenAPI)
description: Learn about OpenAPI extensions in Fern. Customize authentication, SDK methods, versioning, and more for better API specs.
---

Fern supports a variety of OpenAPI extensions that enhance your API specification and generate higher-quality SDKs and [CLIs](/learn/cli-generator/get-started/openapi-extensions).

You can apply these extensions in two ways: by overlaying them in a separate file or by embedding them directly in your OpenAPI specification. See [Overlays](/learn/api-definitions/openapi/overlays) for more information.

## Available extensions

The table below shows all available extensions and links to detailed documentation for each one.

| Extension | Description |
| --- | --- |
| [`x-fern-version`](./api-version) | Configure API version schemes and headers |
| [`x-fern-audiences`](./audiences) | Filter endpoints, schemas, and properties by audience |
| [`x-fern-basic`](/api-definitions/openapi/authentication#basic-security-scheme) | Customize basic authentication parameter names and environment variables |
| [`x-fern-bearer`](/api-definitions/openapi/authentication#bearer-security-scheme) | Customize bearer authentication parameter names and environment variables |
| [`x-fern-availability`](./availability) | Mark availability status (beta, generally-available, deprecated) |
| [`x-fern-base-path`](./base-path) | Set base path prepended to all endpoints |
| [`x-fern-default`](./default-values) | Set client-side default values for path, header, and query parameters |
| [`x-displayName`](./tag-display-names) | Specify how tag names display in your API Reference |
| [`x-fern-enum`](./enum-descriptions-and-names) | Add descriptions, custom names, and deprecation status to enum values |
| [`x-fern-examples`](./request-response-examples) | Associate request and response examples |
| [`x-fern-explorer`](./api-explorer-control) | Control API Explorer (playground) availability globally or per endpoint |
| [`x-fern-global-headers`](./global-headers) | Configure headers used across all endpoints |
| [`x-fern-global-parameters`](./global-parameters) | Configure parameters set once and injected into every relevant request |
| [`x-fern-header`](/api-definitions/openapi/authentication#apikey-security-scheme) | Customize API key header authentication parameter names and environment variables |
| [`x-fern-idempotent`](./idempotency) | Mark an endpoint as idempotent |
| [`x-fern-idempotency-headers`](./idempotency) | Configure idempotency headers for safe request retries |
| [`x-fern-ignore`](./ignoring-elements) | Skip reading specific endpoints or schemas |
| [`x-fern-pagination`](./pagination) | Configure auto-pagination for list endpoints |
| [`x-fern-sdk-method-name`](./method-names) | Customize SDK method names |
| [`x-fern-sdk-group-name`](./method-names) | Organize methods into SDK groups |
| [`x-fern-sdk-variables`](./sdk-variables) | Set common path parameters across all requests |
| [`x-fern-parameter-name`](./parameter-names) | Customize parameter variable names |
| [`x-fern-property-name`](./property-names) | Customize object property variable names |
| [`x-fern-retries`](./retry-behavior) | Configure retry behavior for endpoints |
| [`x-fern-streaming`](/api-definitions/openapi/endpoints/sse) | Configure streaming endpoints (JSON or SSE) |
| [`x-fern-type-name`](./schema-names) | Override auto-generated names for inline schemas |
| [`x-fern-default-url`](./server-names-and-url-templating) | Provide a static fallback URL for templated server URLs |
| [`x-fern-server-name`](./server-names-and-url-templating) | Name your servers and configure URL templating |
| [`x-fern-webhook`](/api-definitions/openapi/endpoints/webhooks) | Define webhooks in OpenAPI 3.0 specifications |
| [`x-fern-webhook-signature`](/api-definitions/openapi/endpoints/webhooks#signature-verification) | Configure webhook signature verification for HMAC or asymmetric validation |

<Note title="Request a new extension">
    If there's an extension you want that doesn't already exist, file an [issue](https://github.com/fern-api/fern/issues/new) to start a discussion about it.
</Note>

### FastAPI

FastAPI allows you to add extensions directly in your route decorators and models. See our [FastAPI integration guide](/learn/api-definitions/openapi/frameworks/fastapi) for detailed examples.
