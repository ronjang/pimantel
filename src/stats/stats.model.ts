export type StatsStatus = {
  totalGuesses: number;
  totalPlayersStarted: number;
  totalSolves: number;
  totalSolveGuesses: number;
  lowestSolveGuesses: number | null;
  buckets: number[];
};
