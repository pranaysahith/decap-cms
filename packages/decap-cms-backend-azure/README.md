# Azure backend

An abstraction layer between the CMS and [Azure DevOps](https://docs.microsoft.com/en-us/rest/api/azure/devops/git/)

## Code structure

`Implementation` for [File Management System API](https://github.com/decaporg/decap-cms/tree/main/packages/decap-cms-lib-util/README.md) based on `Api`.

`Api` - A wrapper for Azure DevOps REST API.

`AuthenticationPage` - facilitates implicit authentication flow. Uses [lib-auth](https://github.com/decaporg/decap-cms/tree/main/packages/decap-cms-lib-auth/README.md).

Look at tests or types for more info.

## Auth modes

- `auth_type: implicit` (default): uses Azure implicit OAuth and access tokens only.
- `auth_type: pkce`: uses OAuth2 PKCE and supports `refresh_token`-based access token refresh.
