export type StatsStatus = {
  totalGuesses: number;
  totalPlayersStarted: number;
  totalSolves: number;
  totalSolveGuesses: number;
  lowestSolveGuesses: number | null;
  focusedAverageGuesses: number | null;
  buckets: number[];
};
