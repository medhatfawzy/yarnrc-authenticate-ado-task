# Security Policy

## Scope

This policy applies to the `yarnrc-authenticate-task` project and its Azure DevOps task implementation under `YarnrcAuthenticate/`.

The task handles package-registry authentication data and may process sensitive values (for example, registry tokens and system access tokens).

## Supported Versions

Security fixes are provided for the latest version on the default branch.

If you are using an older packaged version, upgrade to the latest release before reporting an issue unless the vulnerability prevents an upgrade.

## Reporting a Vulnerability

Please report suspected vulnerabilities privately to the maintainers.

1. Do not open a public issue for vulnerabilities.
2. Include reproduction steps, affected files, and impact.
3. Include version or commit SHA and task inputs used.
4. If secrets are involved, redact all tokens and credentials.

If your organisation has an internal security intake channel, use that channel first and reference this project.

## What to Report

Please report issues such as:

- Secrets exposed in logs, output variables, or generated files unexpectedly.
- Authentication bypass or incorrect endpoint-to-registry matching.
- Unsafe handling of service connection credentials.
- YAML parsing or file-write behaviour that can be abused for privilege escalation.
- Dependency vulnerabilities with practical impact.

## Secure Usage Guidance

- Prefer least-privilege service connections scoped only to required registries.
- Restrict write access to `.yarnrc.yml` in repositories and build agents.
- Avoid printing task inputs and environment variables that may include secrets.
- Ensure pipeline permissions for `System.AccessToken` are limited to required scopes.
- Rotate credentials immediately if you suspect leakage.

## Disclosure Process

After receiving a report, maintainers will:

1. Acknowledge receipt as soon as possible.
2. Validate and assess severity.
3. Prepare and release a fix.
4. Coordinate disclosure timing with the reporter when appropriate.

Response and remediation timelines depend on issue severity and maintainer availability.
