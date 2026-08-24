import { execFile } from "node:child_process";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";

const execFileAsync = promisify(execFile);
const README_PATH = new URL("../README.md", import.meta.url);
const START_MARKER = "<!-- CONNECT-FOUR-README-START -->";
const END_MARKER = "<!-- CONNECT-FOUR-README-END -->";

function updateIds(readme, commitSha, recentGames = []) {
  if (!commitSha) {
    throw new Error("A commit SHA is required to update README image URLs");
  }

  const mainGame = `<div align="center" style="font-size: 0;">\n${Array.from(
    { length: 7 },
    (_, index) =>
      `<a href="https://github.com/MoDevIO/connect-four-readme/issues/new?body=Do%20not%20change%20the%20title&title=do_move%3A${index + 1}"><img src="https://raw.githubusercontent.com/MoDevIO/connect-four-readme/${commitSha}/data/row${index + 1}.svg"></img></a>`,
  ).join("\n")}\n</div>`;
  const recentGameList = recentGames.length
    ? `\n<div align="center">\n${recentGames
        .map(
          (file) =>
            `<img src="https://raw.githubusercontent.com/MoDevIO/connect-four-readme/${commitSha}/data/recent/${file}"></img><br>`,
        )
        .join("\n")}\n</div>`
    : "";
  const content = `${mainGame}${recentGameList}`;

  const markerPattern = new RegExp(
    `(${START_MARKER})[\\s\\S]*?(${END_MARKER})`,
  );

  if (!markerPattern.test(readme)) {
    throw new Error("README markers were not found");
  }

  return readme.replace(markerPattern, `$1\n${content}\n$2`);
}

export { updateIds };
export default updateIds;

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const readme = await readFile(README_PATH, "utf-8");
  const commitSha =
    process.argv[2] ??
    (await execFileAsync("git", ["rev-parse", "HEAD"])).stdout.trim();
  let recentGames = [];
  try {
    recentGames = (await readdir(new URL("../data/recent/", import.meta.url)))
      .filter((file) => file.endsWith(".svg"))
      .sort()
      .reverse()
      .slice(0, 4);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  await writeFile(README_PATH, updateIds(readme, commitSha, recentGames), "utf-8");
}
