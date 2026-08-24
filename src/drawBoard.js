import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";

const moveHistory = await readFile("data/moves.txt", "utf-8");

const ROWS = 6;
const COLUMNS = 7;
const CELL_SIZE = 64;
const BOARD_COLOR = "#ffffff00";
const EMPTY_CELL_COLOR = "#4e4e4e";
const PLAYER_COLOR = "#c45100";
const AI_COLOR = "#0062c4";
const WINNING_LINE_COLOR = "#ffffff";
const RECENT_PADDING = 32;
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

function getWinningLine(board) {
  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];

  for (let row = 0; row < ROWS; row++) {
    for (let column = 0; column < COLUMNS; column++) {
      const color = board[row][column];
      if (!color) continue;

      for (const [rowStep, columnStep] of directions) {
        if (
          Array.from({ length: 4 }, (_, index) => [
            row + index * rowStep,
            column + index * columnStep,
          ]).every(
            ([nextRow, nextColumn]) =>
              nextRow >= 0 &&
              nextRow < ROWS &&
              nextColumn >= 0 &&
              nextColumn < COLUMNS &&
              board[nextRow][nextColumn] === color,
          )
        ) {
          return Array.from({ length: 4 }, (_, index) => [
            row + index * rowStep,
            column + index * columnStep,
          ]);
        }
      }
    }
  }

  return null;
}

function getCells(board, column, xOffset = 0) {
  return board
    .map(
      (row, rowIndex) =>
        `  <circle cx="${xOffset + CELL_SIZE / 2}" cy="${rowIndex * CELL_SIZE + CELL_SIZE / 2}" r="22" fill="${COLORS[row[column]]}"/>`,
    )
    .join("\n");
}

function getFullBoardSvg(board, winningLine) {
  const width = CELL_SIZE * COLUMNS;
  const height = ROWS * CELL_SIZE;
  const shapes = Array.from(
    { length: COLUMNS },
    (_, column) =>
      `<g transform="translate(${column * CELL_SIZE} 0)">${getBoardShape(column, CELL_SIZE, height)}</g>`,
  ).join("\n");
  const cells = Array.from(
    { length: COLUMNS },
    (_, column) => getCells(board, column, column * CELL_SIZE),
  ).join("\n");
  const line = winningLine
    ? `<line x1="${winningLine[0][1] * CELL_SIZE + CELL_SIZE / 2}" y1="${winningLine[0][0] * CELL_SIZE + CELL_SIZE / 2}" x2="${winningLine[3][1] * CELL_SIZE + CELL_SIZE / 2}" y2="${winningLine[3][0] * CELL_SIZE + CELL_SIZE / 2}" stroke="${WINNING_LINE_COLOR}" stroke-width="8" stroke-linecap="round"/>`
    : "";

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Completed Connect Four game">`,
    shapes,
    cells,
    line,
    "</svg>",
  ].join("\n");
}

function addPadding(svg, padding) {
  const openingTag = svg.match(/^<svg\s[^>]*>/)?.[0];
  const dimensions = openingTag?.match(
    /width="(\d+)" height="(\d+)" viewBox="0 0 (\d+) (\d+)"/,
  );
  if (!openingTag || !dimensions) {
    throw new Error("Invalid recent game SVG");
  }

  const [, , , viewBoxWidth, viewBoxHeight] = dimensions;
  const body = svg.slice(openingTag.length, -"</svg>".length);
  const updatedOpeningTag = openingTag
    .replace(
      `viewBox="0 0 ${viewBoxWidth} ${viewBoxHeight}"`,
      `viewBox="0 0 ${Number(viewBoxWidth) + padding * 2} ${Number(viewBoxHeight) + padding * 2}"`,
    );

  return `${updatedOpeningTag}\n<g transform="translate(${padding} ${padding})">${body}</g>\n</svg>`;
}

async function drawBoard(moves) {
  let board = getBoard(moves);
  const width = CELL_SIZE;
  const height = ROWS * CELL_SIZE;
  const winningLine = getWinningLine(board);

  if (winningLine) {
    await mkdir("data/recent", { recursive: true });
    const recentFiles = (await readdir("data/recent")).filter((file) =>
      file.endsWith(".svg"),
    );
    await Promise.all(
      recentFiles.map(async (file) => {
        const path = `data/recent/${file}`;
        await writeFile(path, addPadding(await readFile(path, "utf-8"), RECENT_PADDING), "utf-8");
      }),
    );
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    await writeFile(
      `data/recent/${timestamp}.svg`,
      getFullBoardSvg(board, winningLine),
      "utf-8",
    );
    await writeFile("data/moves.txt", "", "utf-8");
    await writeFile("data/valid_moves.txt", "1234567", "utf-8");
    board = getBoard("");
  }

  for (let column = 0; column < COLUMNS; column++) {
    const cells = getCells(board, column);
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
