import { readFile, writeFile } from "node:fs/promises";

const moveHistory = await readFile("data/moves.txt", "utf-8");

const ROWS = 6;
const COLUMNS = 7;
const CELL_SIZE = 64;
const BOARD_COLOR = "#ffffff00";
const EMPTY_CELL_COLOR = "#4e4e4e";
const PLAYER_COLOR = "#c45100";
const AI_COLOR = "#0062c4";
const COLORS = { null: EMPTY_CELL_COLOR, red: PLAYER_COLOR, yellow: AI_COLOR };

function getBoard(moves) {
  const board = Array.from({ length: ROWS }, () => Array(COLUMNS).fill(null));

  const parsedMoves = moves.match(/[1-7]/g) ?? [];
  for (const [moveIndex, character] of parsedMoves.entries()) {
    const column = Number(character) - 1;
    const row = board.findLastIndex((cells) => cells[column] === null);

    board[row][column] = moveIndex % 2 === 0 ? "red" : "yellow";
  }

  return board;
}

function getBoardShape(column, width, height) {
  if (column === 0) {
    return `<path d="M 6 0 H ${width} V ${height} H 6 A 6 6 0 0 1 0 ${height - 6} V 6 A 6 6 0 0 1 6 0 Z" fill="${BOARD_COLOR}"/>`;
  }

  if (column === COLUMNS - 1) {
    return `<path d="M 0 0 H ${width - 6} A 6 6 0 0 1 ${width} 6 V ${height - 6} A 6 6 0 0 1 ${width - 6} ${height} H 0 Z" fill="${BOARD_COLOR}"/>`;
  }

  return `<rect width="${width}" height="${height}" fill="${BOARD_COLOR}"/>`;
}

async function drawBoard(moves) {
  const board = getBoard(moves);
  const width = CELL_SIZE;
  const height = ROWS * CELL_SIZE;

  for (let column = 0; column < COLUMNS; column++) {
    const cells = board
      .map(
        (row, rowIndex) =>
          `  <circle cx="${width / 2}" cy="${rowIndex * CELL_SIZE + CELL_SIZE / 2}" r="22" fill="${COLORS[row[column]]}"/>`,
      )
      .join("\n");
    const svg = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Connect Four column ${column + 1}">`,
      getBoardShape(column, width, height),
      cells,
      "</svg>",
    ].join("\n");

    await writeFile(`data/row${column + 1}.svg`, svg, "utf-8");
  }
}

await drawBoard(moveHistory);
