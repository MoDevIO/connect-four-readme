import init, { AIPlayer, Position, Difficulty } from "connect-four-ai-wasm";
import { readFile, writeFile } from "node:fs/promises";

const wasm = await readFile(
  "node_modules/.pnpm/connect-four-ai-wasm@1.0.0/node_modules/connect-four-ai-wasm/connect_four_ai_wasm_bg.wasm",
);

await init({ module_or_path: wasm });

const args = process.argv.slice(2);

const moves = String(await readFile("data/moves.txt", "utf-8")).replace(
  /\s+/g,
  "",
);

const position = Position.fromMoves(moves);
const AI = new AIPlayer(Difficulty.EASY);

let moveHistory = moves;
function playMove(col) {
  position.play(col - 1);
  moveHistory += col;
}

playMove(args[0]);

let humanWon = false;
if (position.isWonPosition()) {
  console.log("Players won!");
  humanWon = true;
} else {
  const AI_move = AI.getMove(position) + 1; // Convert to 1-based index
  console.log(`AI plays: ${AI_move}`);
  playMove(AI_move);
}

if (position.isWonPosition() && !humanWon) {
  console.log("AI won!");
}

const validMoves = Array.from({ length: Position.WIDTH }, (_, col) => col + 1)
  .filter((col) => position.isPlayable(col - 1))
  .join("");

await writeFile("data/moves.txt", moveHistory, "utf-8");
await writeFile("data/valid_moves.txt", validMoves, "utf-8");
