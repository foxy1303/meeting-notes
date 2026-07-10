import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const CHANGELOG_PATH = "CHANGELOG.md";
const PACKAGE_PATH = "package.json";
const PACKAGE_LOCK_PATH = "package-lock.json";

const categories = [
  ["feat", "Добавлено"],
  ["fix", "Исправлено"],
  ["refactor", "Рефакторинг"],
  ["test", "Тесты"],
  ["docs", "Документация"],
  ["chore", "Техническое"],
  ["build", "Сборка"],
  ["perf", "Производительность"],
  ["style", "Дизайн"],
];

const bump = readArg("--bump");
const explicitVersion = readArg("--version");
const packageJson = readJson(PACKAGE_PATH);
const nextVersion = explicitVersion || bumpVersion(packageJson.version, bump);
const latestTag = readLatestTag();
const commits = readCommits(latestTag);
const date = new Date().toISOString().slice(0, 10);

if (!nextVersion) {
  throw new Error("Не удалось определить версию для changelog.");
}

if (bump || explicitVersion) {
  updatePackageVersions(nextVersion);
}

writeChangelog(nextVersion, date, commits);

console.log(`CHANGELOG.md обновлен для версии ${nextVersion}`);

function readArg(name) {
  const arg = process.argv.find((item) => item.startsWith(`${name}=`));

  if (arg) {
    return arg.slice(name.length + 1);
  }

  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : "";
}

function bumpVersion(version, level) {
  if (!level) {
    return version;
  }

  const parts = version.split(".").map(Number);

  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    throw new Error(`Версия должна быть semver: ${version}`);
  }

  const [major, minor, patch] = parts;

  if (level === "major") {
    return `${major + 1}.0.0`;
  }

  if (level === "minor") {
    return `${major}.${minor + 1}.0`;
  }

  if (level === "patch") {
    return `${major}.${minor}.${patch + 1}`;
  }

  throw new Error(`Неизвестный bump: ${level}`);
}

function readLatestTag() {
  try {
    return execFileSync("git", ["describe", "--tags", "--abbrev=0"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function readCommits(tag) {
  const range = tag ? `${tag}..HEAD` : "HEAD";
  const output = execFileSync(
    "git",
    ["log", "--format=%H%x1f%s%x1f%ad", "--date=short", range],
    { encoding: "utf8" },
  ).trim();

  if (!output) {
    return [];
  }

  return output.split("\n").map((line) => {
    const [hash, subject, commitDate] = line.split("\u001f");
    const parsed = parseSubject(subject);

    return {
      date: commitDate,
      hash: hash.slice(0, 7),
      ...parsed,
    };
  });
}

function parseSubject(subject) {
  const match = subject.match(/^(\w+)(?:\([^)]+\))?!?:\s*(.+)$/);

  if (!match) {
    return { description: subject, type: "other" };
  }

  return { description: match[2], type: match[1] };
}

function writeChangelog(version, releaseDate, commits) {
  const previous = readFile(CHANGELOG_PATH);
  const body = buildReleaseSection(version, releaseDate, commits);
  const header =
    "# Журнал изменений\n\n" +
    "Все значимые изменения проекта формируются из git-коммитов.\n\n";
  const content = previous.startsWith("# Журнал изменений")
    ? replaceOrPrependRelease(previous, version, body)
    : `${header}${body}`;

  writeFileSync(CHANGELOG_PATH, content);
}

function buildReleaseSection(version, releaseDate, commits) {
  const grouped = groupCommits(commits);
  const lines = [`## ${version} - ${releaseDate}`, ""];

  if (commits.length === 0) {
    lines.push("- Изменений с последнего релиза нет.", "");
    return lines.join("\n");
  }

  for (const [, title] of categories) {
    const items = grouped.get(title) || [];

    if (items.length === 0) {
      continue;
    }

    lines.push(`### ${title}`);
    lines.push(...items.map(formatCommit));
    lines.push("");
  }

  const other = grouped.get("Прочее") || [];

  if (other.length > 0) {
    lines.push("### Прочее");
    lines.push(...other.map(formatCommit));
    lines.push("");
  }

  return lines.join("\n");
}

function groupCommits(commits) {
  const grouped = new Map();

  for (const commit of commits) {
    const category = categories.find(([type]) => type === commit.type)?.[1] || "Прочее";
    grouped.set(category, [...(grouped.get(category) || []), commit]);
  }

  return grouped;
}

function formatCommit(commit) {
  return `- ${translateDescription(commit.description)} (${commit.hash}, ${commit.date})`;
}

function translateDescription(description) {
  const translations = {
    "Initial commit from Create Next App": "начальный проект Create Next App",
    "add contextual result exports": "добавлено контекстное скачивание результатов",
    "add transcription ui": "добавлен интерфейс транскрипции",
    "cover transcription helpers": "добавлены тесты helper-функций транскрипции",
    "harden transcription backend": "усилена серверная обработка транскрипции",
    "refine transcription interface": "улучшен интерфейс транскрипции",
  };

  return translations[description] || description;
}

function replaceOrPrependRelease(content, version, section) {
  const releasePattern = new RegExp(
    `## ${escapeRegExp(version)} - \\d{4}-\\d{2}-\\d{2}[\\s\\S]*?(?=\\n## |$)`,
  );

  if (releasePattern.test(content)) {
    return content.replace(releasePattern, section.trimEnd());
  }

  return content.replace(
    /^(# Журнал изменений\n\n(?:.*\n\n)?)/,
    `$1${section}`,
  );
}

function updatePackageVersions(version) {
  const nextPackageJson = readJson(PACKAGE_PATH);
  nextPackageJson.version = version;
  writeJson(PACKAGE_PATH, nextPackageJson);

  const lock = readJson(PACKAGE_LOCK_PATH);
  lock.version = version;

  if (lock.packages?.[""]) {
    lock.packages[""].version = version;
  }

  writeJson(PACKAGE_LOCK_PATH, lock);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function readFile(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
