import React, { useEffect, useRef } from "react";
import { Word } from "./guesses.model";

function GuessEntry({
  guess,
  animated = false,
}: {
  guess: Word;
  animated?: boolean;
}) {
  function getFlavorText(rank: number): string {
    if (rank === 0) {
      return "GELÖST! 🎯";
    } else if (rank < 10) {
      return "🔥🔥🔥";
    } else if (rank < 50) {
      return "🔥🔥";
    } else if (rank < 100) {
      return "🔥";
    } else if (rank < 200) {
      return "Heiß";
    } else if (rank < 500) {
      return "Warm";
    } else if (rank < 1_000) {
      return "Lauwarm";
    } else if (rank < 3_000) {
      return "Lau";
    } else if (rank < 10_000) {
      return "Kühl";
    } else if (rank < 20_000) {
      return "Frisch";
    } else if (rank < 50_000) {
      return "Kalt";
    } else if (rank < 75_000) {
      return "Eisig";
    } else {
      return "Eiskalt";
    }
  }

  function getColorClass(rank: number) {
    if (rank === 0) {
      return "bg-correct";
    } else if (rank < 10) {
      return "bg-very-hot";
    } else if (rank < 50) {
      return "bg-quite-hot";
    } else if (rank < 100) {
      return "bg-hot";
    } else if (rank < 500) {
      return "bg-toasty";
    } else if (rank < 1_000) {
      return "bg-warm";
    } else if (rank < 3_000) {
      return "bg-tepid";
    } else if (rank < 50_000) {
      return "bg-cold";
    } else {
      return "bg-frigid";
    }
  }

  return (
    <div
      className={`guess-wrapper ${
        animated && !guess.isBulk && guess.rank !== 0 ? "slide-in" : ""
      }`}
    >
      <div
        key={guess.word}
        className={`guess-entry ${
          guess.isEgg ? "bg-egg" : getColorClass(guess.rank)
        } ${guess.isHint ? "guess-hint" : ""}`}
      >
        <div className="guess-index">{guess.guessIndex}</div>
        <div className="guess-word">{guess.word}</div>
        <div className="guess-similarity">{guess.similarity.toFixed(2)}</div>
        <div
          className={
            guess.rank < 1000 ? "guess-rank" : "guess-rank-placeholder"
          }
        >
          {guess.rank !== 0 && (guess.rank < 1000 ? "#" + guess.rank : "--")}
        </div>
        <div className="guess-flavor">
          {guess.isEgg
            ? "🥚"
            : guess.isHint
            ? "Hinweis"
            : getFlavorText(guess.rank)}
        </div>
      </div>
    </div>
  );
}

export default GuessEntry;
