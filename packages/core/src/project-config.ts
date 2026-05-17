import { access, appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, relative, resolve } from "node:path";
import { z } from "zod";

const PROJECT_NAME_PATTERN = /^[A-Za-z0-9._-]+$/;

const projectNameSchema = z
  .string()
  .min(1)
  .regex(PROJECT_NAME_PATTERN)
  .refine((value) => value !== "." && value !== "..", {
    message: "project cannot be . or .."
  });

export const projectConfigSchema = z.object({
  project: projectNameSchema,
  repo_path: z.string().min(1),
  github_repo: z.string().min(1).regex(/^[^/\s]+\/[^/\s]+$/),
  ledger: z.string().min(1)
});

export type ProjectConfig = z.infer<typeof projectConfigSchema>;

export const projectManifestSchema = projectConfigSchema.extend({
  schema_version: z.literal("0.1.0"),
  prim_root: z.string().min(1),
  managed: z.literal(true)
});

export type ProjectManifest = z.infer<typeof projectManifestSchema>;

export interface InitProjectOptions {
  project?: string;
  repoPath: string;
  githubRepo: string;
  rootDir?: string;
  force?: boolean;
}

export interface InitProjectResult {
  config: ProjectConfig;
  configPath: string;
  ledgerPath: string;
  configWritten: boolean;
  ledgerCreated: boolean;
}

export interface InstallProjectResult extends InitProjectResult {
  manifest: ProjectManifest;
  manifestPath: string;
  manifestWritten: boolean;
}

export interface RuntimeLedgerOptions {
  project?: string;
  repoPath?: string;
}

export function inferProjectName(repoPath: string): string {
  return basename(resolve(repoPath));
}

export function getProjectDir(rootDir: string, project: string): string {
  return resolve(rootDir, "data", "projects", projectNameSchema.parse(project));
}

export function getProjectConfigPath(rootDir: string, project: string): string {
  return resolve(getProjectDir(rootDir, project), "project.json");
}

export function getProjectLedgerPath(rootDir: string, project: string): string {
  return resolve(getProjectDir(rootDir, project), "events.jsonl");
}

export async function initProjectConfig(
  options: InitProjectOptions
): Promise<InitProjectResult> {
  const rootDir = resolve(options.rootDir ?? process.cwd());
  const repoPath = resolve(options.repoPath);
  const project = projectNameSchema.parse(options.project ?? inferProjectName(repoPath));
  const ledgerPath = getProjectLedgerPath(rootDir, project);
  const configPath = getProjectConfigPath(rootDir, project);
  const config = projectConfigSchema.parse({
    project,
    repo_path: repoPath,
    github_repo: options.githubRepo,
    ledger: toPosixPath(relative(rootDir, ledgerPath))
  });

  await mkdir(dirname(configPath), { recursive: true });

  const serialized = `${JSON.stringify(config, null, 2)}\n`;
  const existing = await readExistingText(configPath);
  let configWritten = false;

  if (existing === undefined || existing !== serialized) {
    if (existing !== undefined && !options.force) {
      throw new Error(`project config already exists: ${configPath}`);
    }
    await writeFile(configPath, serialized, "utf8");
    configWritten = true;
  }

  const ledgerCreated = !(await pathExists(ledgerPath));
  await appendFile(ledgerPath, "", "utf8");

  return {
    config,
    configPath,
    ledgerPath,
    configWritten,
    ledgerCreated
  };
}

export async function installProjectConfig(
  options: InitProjectOptions
): Promise<InstallProjectResult> {
  const rootDir = resolve(options.rootDir ?? process.cwd());
  const result = await initProjectConfig({ ...options, rootDir });
  const manifestPath = resolve(result.config.repo_path, ".prim.json");
  const manifest = projectManifestSchema.parse({
    schema_version: "0.1.0",
    ...result.config,
    prim_root: rootDir,
    managed: true
  });
  const serialized = `${JSON.stringify(manifest, null, 2)}\n`;
  const existing = await readExistingText(manifestPath);
  let manifestWritten = false;

  if (existing === undefined || existing !== serialized) {
    if (existing !== undefined && !options.force) {
      throw new Error(`Prim manifest already exists: ${manifestPath}`);
    }
    await writeFile(manifestPath, serialized, "utf8");
    manifestWritten = true;
  }

  return {
    ...result,
    manifest,
    manifestPath,
    manifestWritten
  };
}

export async function readProjectConfig(
  rootDir: string,
  project: string
): Promise<ProjectConfig> {
  const configPath = getProjectConfigPath(resolve(rootDir), project);
  const raw = await readFile(configPath, "utf8");
  return projectConfigSchema.parse(JSON.parse(raw));
}

export async function resolveProjectLedgerPath(
  rootDir: string,
  project: string
): Promise<string> {
  const root = resolve(rootDir);
  const config = await readProjectConfig(root, project);
  return isAbsolute(config.ledger) ? config.ledger : resolve(root, config.ledger);
}

export async function resolveRuntimeLedgerPath(
  rootDir = process.cwd(),
  env: NodeJS.ProcessEnv = process.env,
  options: RuntimeLedgerOptions = {}
): Promise<string> {
  const root = resolve(rootDir);

  if (options.project && options.repoPath) {
    throw new Error("--project and --repo cannot be used together");
  }

  if (options.repoPath) {
    return resolveRepoLedgerPath(options.repoPath);
  }

  if (options.project) {
    const manifest = await readProjectManifestFromCwd(root);
    return resolveProjectLedgerPath(
      manifest ? resolve(manifest.prim_root) : root,
      options.project
    );
  }

  if (env.PRIM_LEDGER_PATH) {
    return resolve(env.PRIM_LEDGER_PATH);
  }

  const manifest = await readProjectManifestFromCwd(root);
  if (manifest && resolve(manifest.prim_root) !== root) {
    return resolveManifestLedgerPath(manifest);
  }

  if (env.PRIM_PROJECT) {
    return resolveProjectLedgerPath(root, env.PRIM_PROJECT);
  }

  if (manifest) {
    return resolveManifestLedgerPath(manifest);
  }

  return resolve(root, "data", "prim-events.jsonl");
}

export async function resolveRepoLedgerPath(repoPath: string): Promise<string> {
  const repoRoot = resolve(repoPath);
  const manifest = await readProjectManifestFromCwd(repoRoot);
  if (!manifest) {
    throw new Error(`Prim manifest not found: ${resolve(repoRoot, ".prim.json")}`);
  }
  return resolveManifestLedgerPath(manifest);
}

export async function readProjectManifestFromCwd(
  rootDir = process.cwd()
): Promise<ProjectManifest | undefined> {
  const manifestPath = resolve(rootDir, ".prim.json");
  const raw = await readExistingText(manifestPath);
  if (raw === undefined) {
    return undefined;
  }
  return projectManifestSchema.parse(JSON.parse(raw));
}

function resolveManifestLedgerPath(manifest: ProjectManifest): string {
  return isAbsolute(manifest.ledger)
    ? manifest.ledger
    : resolve(manifest.prim_root, manifest.ledger);
}

async function readExistingText(filePath: string): Promise<string | undefined> {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

function toPosixPath(filePath: string): string {
  return filePath.replaceAll("\\", "/");
}
