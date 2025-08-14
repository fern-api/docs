---
title: Overview of OpenAPI extensions
description: Learn about Fern's OpenAPI extensions
---
Fern supports a variety of OpenAPI extensions that enhance your API specification and generate higher-quality SDKs. You can apply these extensions in two ways: by overlaying them in separate override files or by embedding them directly in your OpenAPI specification.

## Available extensions

The table below shows all available extensions and links to detailed documentation for each one.

| Extension | Description |
| --- | --- |
| [`x-fern-version`](./api-version) | Configure API version schemes and headers |
| [`x-fern-audiences`](./audiences) | Filter endpoints, schemas, and properties by audience |
| [`x-fern-availability`](./availability) | Mark availability status (beta, generally-available, deprecated) |
| [`x-fern-base-path`](./base-path) | Set base path prepended to all endpoints |
| [`x-fern-enum`](./enums) | Add descriptions and custom names to enum values |
| [`x-fern-examples`](./examples) | Associate request and response examples |
| [`x-fern-global-headers`](./global-headers) | Configure headers used across all endpoints |
| [`x-fern-ignore`](./ignore) | Skip reading specific endpoints or schemas |
| [`x-fern-sdk-method-name`](./method-names) | Customize SDK method names |
| [`x-fern-sdk-group-name`](./method-names) | Organize methods into SDK groups |
| [`x-fern-parameter-name`](./parameter-names) | Customize parameter variable names |
| [`x-fern-property-name`](./property-names) | Customize object property variable names |
| [`x-fern-type-name`](./schema-names) | Override auto-generated names for inline schemas |
| [`x-fern-server-name`](./server-names) | Name your servers |

<Note title="Request a new extension">
    If there's an extension you want that doesn't already exist, file an [issue](https://github.com/fern-api/fern/issues/new) to start a discussion about it.
</Note>

## Overlaying extensions

Overlaying extensions allows you to keep your original OpenAPI specification clean while adding Fern-specific customizations in a separate file. This approach is ideal when you're using multiple tools that consume your OpenAPI spec, or when you want to maintain a pristine source specification.

To use overlays, specify an overrides file in your `generators.yml` configuration.

The example below shows how to overlay SDK naming extensions. The first tab shows the `generators.yml` configuration that references an overrides file, the second tab contains the overrides file with Fern extensions, and the third tab shows the final result when the extensions are applied to your original OpenAPI specification.

<CodeBlocks>
    ```yaml title="generators.yml" {3}
    api:
      path: ./openapi/openapi.yaml
      overrides: ./openapi/overrides.yaml
    default-group: sdk
    groups:
      sdk:
        generators:
          - name: fernapi/fern-python-sdk
            version: 2.2.0
    ```

    ```yaml title="overrides.yml" {4-5}
    paths:
      /users:
        get:
          x-fern-sdk-group-name: users
          x-fern-sdk-method-name: get
    ```

    ```yaml title="Overlaid OpenAPI" {4-5}
    paths:
      /users:
        get:
          x-fern-sdk-group-name: users
          x-fern-sdk-method-name: get
          summary: Get a list of users
          description: Retrieve a list of users from the system.
          responses:
            '200':
              description: Successful response
            '500':
              description: Internal Server Error
    ```

</CodeBlocks>

## Embedding extensions

Instead of using overlay files, you can embed Fern extensions directly within your OpenAPI specification or source code. This approach is useful when you want to keep extensions close to your API definitions or when using frameworks that support custom extensions.

### Direct embedding in OpenAPI

You can add Fern extensions directly to your OpenAPI specification:

```yaml title="openapi.yml"
paths:
  /users:
    get:
      x-fern-sdk-group-name: users
      x-fern-sdk-method-name: listUsers
      x-fern-availability: generally-available
      summary: Get a list of users
      responses:
        '200':
          description: Successful response
```

### FastAPI

FastAPI allows you to add extensions directly in your route decorators and models. See our [FastAPI integration guide](/api-definition/openapi/frameworks/fastapi) for detailed examples.
