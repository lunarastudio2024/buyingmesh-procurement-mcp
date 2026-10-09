# Contributing

1. Create a focused branch for one change.
2. Keep tool schemas, descriptions and REST calls aligned with the public
   OpenAPI contract at <https://buyingmesh.com/openapi.json>.
3. Never commit credentials, payment signatures, supplier documents or private
   customer data.
4. Run `npm test` before opening a pull request.

Changes that affect tool names, input schemas, protocol versions or settlement
behavior need a compatibility note in the pull request.

