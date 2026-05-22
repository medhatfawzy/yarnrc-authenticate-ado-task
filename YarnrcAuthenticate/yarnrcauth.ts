import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import * as tl from "azure-pipelines-task-lib/task";

type AuthScheme = {
  registryUrl: string;
  token: string;
  authIdent: string;
};

type YamlObject = Record<string, unknown>;

type EndpointAuthorization = {
  scheme?: string;
  parameters?: Record<string, string>;
};

function normalizeRegistry(raw: string): string {
  if (!raw) {
    return "";
  }

  let candidate = raw.trim();
  if (!candidate) {
    return "";
  }

  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  const u = new URL(candidate);
  u.hash = "";
  u.search = "";
  const normalizedPath = u.pathname.endsWith("/")
    ? u.pathname
    : `${u.pathname}/`;
  return `${u.protocol}//${u.host.toLowerCase()}${normalizedPath}`;
}

function parseEndpointIds(input: string): string[] {
  if (!input) {
    return [];
  }

  return input
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
}

function resolveEndpointCredential(endpointId: string): AuthScheme {
  const registryUrl = normalizeRegistry(
    tl.getEndpointUrl(endpointId, false) || "",
  );
  const auth = tl.getEndpointAuthorization(
    endpointId,
    false,
  ) as EndpointAuthorization;
  const scheme = (auth?.scheme || "").toLowerCase();
  const parameters = auth?.parameters || {};

  if (scheme === "token") {
    const token =
      parameters.apitoken ||
      parameters.AccessToken ||
      parameters.accessToken ||
      "";
    if (!token) {
      throw new Error(
        `Endpoint ${endpointId} uses Token auth but no token parameter was found.`,
      );
    }
    tl.setSecret(token);
    return { registryUrl, token, authIdent: "" };
  }

  if (scheme === "usernamepassword") {
    const username = parameters.username || "";
    const password = parameters.password || "";
    if (!username || !password) {
      throw new Error(
        `Endpoint ${endpointId} uses UsernamePassword auth but credentials are incomplete.`,
      );
    }
    tl.setSecret(password);
    return { registryUrl, token: "", authIdent: `${username}:${password}` };
  }

  throw new Error(
    `Unsupported endpoint auth scheme '${auth?.scheme || "unknown"}' for endpoint ${endpointId}.`,
  );
}

function ensureObject(parent: YamlObject, key: string): YamlObject {
  const current = parent[key];
  if (!current || typeof current !== "object" || Array.isArray(current)) {
    parent[key] = {};
  }

  return parent[key] as YamlObject;
}

async function run(): Promise<void> {
  try {
    tl.setResourcePath(path.join(__dirname, "..", "task.json"));

    const workingFile = tl.getInput("workingFile", true) as string;
    if (
      !workingFile.endsWith(".yarnrc.yml") &&
      !workingFile.endsWith(".yarnrc.yaml")
    ) {
      throw new Error(
        `workingFile must point to .yarnrc.yml or .yarnrc.yaml. Received: ${workingFile}`,
      );
    }

    if (!fs.existsSync(workingFile)) {
      throw new Error(`The file '${workingFile}' does not exist.`);
    }

    const endpointIds = parseEndpointIds(
      tl.getInput("customEndpoint", false) || "",
    );
    if (endpointIds.length === 0) {
      tl.warning("No customEndpoint provided. Nothing to authenticate.");
      return;
    }

    const endpointCredentials = endpointIds.map(resolveEndpointCredential);
    const byRegistry = new Map<string, AuthScheme>();
    endpointCredentials.forEach((cred) =>
      byRegistry.set(cred.registryUrl, cred),
    );

    const content = fs.readFileSync(workingFile, "utf8");
    const doc = (yaml.load(content) || {}) as YamlObject;

    const npmScopes = ensureObject(doc, "npmScopes");
    const npmRegistries = ensureObject(doc, "npmRegistries");

    let updatedScopes = 0;
    Object.keys(npmScopes).forEach((scopeName) => {
      const scopeConfig = ensureObject(npmScopes, scopeName);
      const registry = normalizeRegistry(
        String(scopeConfig.npmRegistryServer || ""),
      );
      if (!registry) {
        return;
      }

      const cred = byRegistry.get(registry);
      if (!cred) {
        return;
      }

      scopeConfig.npmAlwaysAuth = true;
      if (cred.token) {
        scopeConfig.npmAuthToken = cred.token;
        delete scopeConfig.npmAuthIdent;
      } else {
        scopeConfig.npmAuthIdent = cred.authIdent;
        delete scopeConfig.npmAuthToken;
      }

      updatedScopes += 1;
    });

    let updatedRegistries = 0;
    endpointCredentials.forEach((cred) => {
      const regConfig = ensureObject(npmRegistries, cred.registryUrl);
      regConfig.npmAlwaysAuth = true;
      if (cred.token) {
        regConfig.npmAuthToken = cred.token;
        delete regConfig.npmAuthIdent;
      } else {
        regConfig.npmAuthIdent = cred.authIdent;
        delete regConfig.npmAuthToken;
      }
      updatedRegistries += 1;
    });

    const updated = yaml.dump(doc, { lineWidth: -1, noRefs: true });
    fs.writeFileSync(workingFile, updated, "utf8");

    tl.debug(`Updated scopes: ${updatedScopes}`);
    tl.debug(`Updated registries: ${updatedRegistries}`);
    console.log(
      `Updated ${updatedScopes} npmScopes and ${updatedRegistries} npmRegistries in ${workingFile}.`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    tl.setResult(tl.TaskResult.Failed, message);
  }
}

void run();
