declare module "node:child_process" {
  export function execFileSync(
    command: string,
    args: string[],
    options: { encoding: "utf8"; stdio: [string, string, string] },
  ): string;
}

declare module "node:fs" {
  export function appendFileSync(
    path: string,
    data: string,
    encoding: "utf8",
  ): void;
  export function readFileSync(path: string, encoding: "utf8"): string;
}

declare const process: {
  env: Record<string, string | undefined>;
  exitCode?: number;
};
