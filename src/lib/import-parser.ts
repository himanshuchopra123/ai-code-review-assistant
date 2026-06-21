import * as path from "path";

const EXTERNAL_PREFIXES = [
  "react", "next", "express", "node:", "fs", "path", "os", "crypto",
  "http", "https", "url", "util", "stream", "events", "child_process",
  "@types/", "@anthropic", "@supabase", "zod", "axios", "lodash",
  "mongoose", "prisma", "drizzle", "tailwind", "postcss",
];

const SKIP_EXTENSIONS = [".css", ".scss", ".svg", ".png", ".jpg", ".json", ".md"];

function isLocalImport(importPath: string): boolean {
  if (importPath.startsWith("./") || importPath.startsWith("../")) return true;
  if (importPath.startsWith("@/")) return true;
  return false;
}

function isExternalPackage(importPath: string): boolean {
  return EXTERNAL_PREFIXES.some((prefix) => importPath.startsWith(prefix));
}

function shouldSkip(resolvedPath: string): boolean {
  return SKIP_EXTENSIONS.some((ext) => resolvedPath.endsWith(ext));
}

function resolveImportPath(importPath: string, fromFile: string): string | null {
  if (importPath.startsWith("@/")) {
    return "src/" + importPath.slice(2);
  }

  const dir = path.dirname(fromFile);
  const resolved = path.posix.normalize(dir + "/" + importPath);
  return resolved;
}

function parsePythonImports(content: string): string[] {
  const imports: string[] = [];
  const fromRegex = /^from\s+(\.[\w./]*)\s+import/gm;
  let match;
  while ((match = fromRegex.exec(content)) !== null) {
    const mod = match[1].replace(/\./g, "/");
    imports.push(mod + ".py");
  }
  return imports;
}

function parseJSTSImports(content: string): string[] {
  const imports: string[] = [];
  const importRegex = /(?:import\s+.*?from\s+|require\s*\(\s*)['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    if (isExternalPackage(importPath)) continue;
    if (!isLocalImport(importPath) && !importPath.startsWith("@/")) continue;
    imports.push(importPath);
  }
  return imports;
}

function parseGoImports(content: string): string[] {
  const imports: string[] = [];
  const singleRegex = /^import\s+"([^"]+)"/gm;
  const blockRegex = /import\s*\(([\s\S]*?)\)/g;
  let match;
  while ((match = singleRegex.exec(content)) !== null) {
    if (!match[1].includes(".")) continue;
    imports.push(match[1]);
  }
  while ((match = blockRegex.exec(content)) !== null) {
    const lines = match[1].split("\n");
    for (const line of lines) {
      const pathMatch = line.match(/"([^"]+)"/);
      if (pathMatch && pathMatch[1].includes("/")) {
        imports.push(pathMatch[1]);
      }
    }
  }
  return imports;
}

function parseJavaImports(content: string): string[] {
  const imports: string[] = [];
  const regex = /^import\s+([\w.]+);/gm;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const parts = match[1].split(".");
    const filePath = parts.join("/") + ".java";
    imports.push(filePath);
  }
  return imports;
}

function detectLanguage(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".py") return "python";
  if ([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"].includes(ext)) return "jsts";
  if (ext === ".go") return "go";
  if ([".java", ".kt", ".scala"].includes(ext)) return "java";
  return "unknown";
}

const JS_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];

export function parseImports(content: string, filename: string): string[] {
  const lang = detectLanguage(filename);
  let rawImports: string[];

  switch (lang) {
    case "python":
      rawImports = parsePythonImports(content);
      break;
    case "jsts":
      rawImports = parseJSTSImports(content);
      break;
    case "go":
      rawImports = parseGoImports(content);
      break;
    case "java":
      rawImports = parseJavaImports(content);
      break;
    default:
      return [];
  }

  const resolved: string[] = [];
  for (const imp of rawImports) {
    const res = resolveImportPath(imp, filename);
    if (!res) continue;
    if (shouldSkip(res)) continue;

    if (lang === "jsts" && !path.extname(res)) {
      for (const ext of JS_EXTENSIONS) {
        resolved.push(res + ext);
      }
    } else {
      resolved.push(res);
    }
  }

  return resolved;
}
