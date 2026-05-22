# Yarnrc Authenticate Task (Minimal)

Minimal custom Azure DevOps task inspired by `NpmAuthenticateV0`, but targeting `.yarnrc.yml`.

## What it does

- Reads a `.yarnrc.yml` file from `workingFile`.
- Reads service connection credentials from `customEndpoint` (comma-separated IDs).
- Matches service-connection registry URLs to `npmScopes.*.npmRegistryServer`.
- Writes auth into:
  - `npmScopes[scope].npmAuthToken` or `npmAuthIdent`
  - `npmRegistries[registry].npmAuthToken` or `npmAuthIdent`
- Sets `npmAlwaysAuth: true` for matched entries.

## Structure

- `Tasks/YarnrcAuthenticate/task.json`
- `Tasks/YarnrcAuthenticate/src/yarnrcauth.ts`
- `Tasks/YarnrcAuthenticate/dist/yarnrcauth.js` (generated)
- `package.json`
- `tsconfig.json`

## Install deps

```bash
yarn install
yarn build
```

## Use in pipeline (after packaging and publishing the custom task)

```yaml
- task: YarnrcAuthenticate@1
  inputs:
    workingFile: $(Build.SourcesDirectory)/.yarnrc.yml
    customEndpoint: your-service-connection-id
```

## Notes

- `workingFile` must be `.yarnrc.yml` or `.yarnrc.yaml`.
- If no `customEndpoint` is provided, task exits with warning and no file changes.
