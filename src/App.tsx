import { useEffect, useRef, useState } from "react";
import "./App.css";
import wordListEn from "./data/word_list.json";
import wordListDe from "./data/word_list_de.json";
import { getFloat16 } from "@petamoriken/float16";
import PlotContainer from "./plot/PlotContainer";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import dayjs from "dayjs";
import { ArchiveLink } from "./archive/ArchiveLink";
import ArchiveDropdown from "./archive/ArchiveDropdown";
import SettingsDropdown from "./settings/SettingsDropdown";
import { Word } from "./guesses/guesses.model";
import { PuzzleType } from "./puzzle/puzzle.model";
import { loadProgress, migrateLocalStorage } from "./puzzle/puzzle.component";
import { StatsStatus } from "./stats/stats.model";
import Guesses from "./guesses/guesses.component";
// @ts-ignore
import Plotly from "plotly.js-gl2d-dist-min";
import { GameLanguage, LANGUAGE_CONFIGS } from "./data/languageConfig";
import MultiplayerBackground from "./MultiplayerBackground";
import ServerPanel from "./server/ServerPanel.component";
import { io, Socket } from "socket.io-client";
import { Subject } from "rxjs";
import {
  ClientEvent,
  GuessAck,
  LesserStatsUpdate,
  ServerEvent,
  SolveStatus,
  StatsUpdate,
} from "./SocketTypes";

// Set to true when a backend is available again
const MULTIPLAYER_ENABLED =
  process.env.REACT_APP_MULTIPLAYER_ENABLED === "true";

const MULTIPLAYER_SOCKET_URL =
  process.env.REACT_APP_MULTIPLAYER_SOCKET_URL ||
  (window.location.hostname === "localhost"
    ? "http://localhost:8000"
    : `${window.location.protocol}//api.pimantel.de`);

const FRONTEND_COMMIT_SHA = process.env.REACT_APP_VERSION || "dev";
const FRONTEND_SEMVER = process.env.REACT_APP_SEMVER || "0.1.0";
const FRONTEND_VERSION_URL =
  process.env.REACT_APP_VERSION_URL ||
  "https://github.com/ronjang/pimantel/commits/main";

function buildFrontendVersionLabel() {
  const shortSha = FRONTEND_COMMIT_SHA.slice(0, 8);
  if (shortSha === "dev") {
    return `${FRONTEND_SEMVER}+dev`;
  }

  return `${FRONTEND_SEMVER}+${shortSha}`;
}

function generatePlayerId(): string {
  const cryptoApi = window.crypto;
  if (cryptoApi && typeof cryptoApi.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    cryptoApi.getRandomValues(bytes);
    return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join(
      ""
    );
  }

  return `${Date.now()}-fallback-player-id`;
}

function buildEmptyStats(): StatsStatus {
  return {
    totalGuesses: 0,
    totalPlayersStarted: 0,
    totalSolves: 0,
    totalSolveGuesses: 0,
    lowestSolveGuesses: null,
    buckets: new Array(25).fill(0),
  };
}

function mapStatsUpdateToStatus(
  update: StatsUpdate | LesserStatsUpdate,
  previous: StatsStatus
): StatsStatus {
  if (update.type === "lesser") {
    return {
      ...previous,
      totalGuesses: update.totalGuesses,
    };
  }

  return {
    totalGuesses: update.total_guesses || 0,
    totalPlayersStarted: update.total_players_started || 0,
    totalSolves: update.total_solves || 0,
    totalSolveGuesses: update.total_guesses_for_solves || 0,
    lowestSolveGuesses:
      typeof update.lowest_guesses_to_solve === "number"
        ? update.lowest_guesses_to_solve
        : null,
    buckets: [
      update.solve_bucket_1_20,
      update.solve_bucket_21_40,
      update.solve_bucket_41_60,
      update.solve_bucket_61_80,
      update.solve_bucket_81_100,
      update.solve_bucket_101_120,
      update.solve_bucket_121_140,
      update.solve_bucket_141_160,
      update.solve_bucket_161_180,
      update.solve_bucket_181_200,
      update.solve_bucket_201_220,
      update.solve_bucket_221_240,
      update.solve_bucket_241_260,
      update.solve_bucket_261_280,
      update.solve_bucket_281_300,
      update.solve_bucket_301_320,
      update.solve_bucket_321_340,
      update.solve_bucket_341_360,
      update.solve_bucket_361_380,
      update.solve_bucket_381_400,
      update.solve_bucket_401_420,
      update.solve_bucket_421_440,
      update.solve_bucket_441_460,
      update.solve_bucket_461_480,
      update.solve_bucket_481_500,
    ],
  };
}

type QueuedGuess = {
  x: number;
  y: number;
  solveStatus: SolveStatus | undefined;
};

function getStatsCacheKey(puzzleType: PuzzleType, currentPuzzle: string): string {
  return `pimantel-stats-snapshot-${puzzleType}-${currentPuzzle}`;
}

function getGuessQueueKey(puzzleType: PuzzleType, currentPuzzle: string): string {
  return `pimantel-pending-guesses-${puzzleType}-${currentPuzzle}`;
}

function App() {
  let [language] = useState<GameLanguage>("de");
  let [secret, setSecret] = useState<Word>();
  let [xValues, setXValues] = useState<number[]>([]);
  let [yValues, setYValues] = useState<number[]>([]);
  let [plotData, setPlotData] = useState<Plotly.Data[]>([]);
  let hoverEnabled = useRef<boolean>(true);
  let [displayedXRange, setDisplayedXRange] = useState<number[]>([-0.5, 0.5]);
  let [displayedYRange, setDisplayedYRange] = useState<number[]>([
    -0.28125, 0.28125,
  ]);
  const scroller = useRef<HTMLDivElement>(null);

  let [archiveOpen, setArchiveOpen] = useState<boolean>(false);
  let [isArchivePuzzle, setIsArchivePuzzle] = useState<boolean>(false);

  let [archivePimantles, setArchivePimantles] = useState<ArchiveLink[]>([]);
  let [puzzleType, setPuzzleType] = useState<PuzzleType>("pimantle");
  let [currentPuzzle, setCurrentPuzzle] = useState<string>("?");
  let [parsedWords, setParsedWords] = useState<Word[]>([]);
  let [guesses, setGuesses] = useState<Word[]>([]);
  let [languageDataAvailable, setLanguageDataAvailable] = useState<boolean>(true);
  let [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  let [dataRevision, setDataRevision] = useState<number>(0);
  let [bizarreEdgeCaseThingIHateIt, setBizarreEdgeCaseThingIHateIt] =
    useState<number>(Math.random() / 10000 + 0.00001);
  let [plotCenter, setPlotCenter] = useState<number[]>([0, 0]);

  let [nextPuzzleTime, setNextPuzzleTime] = useState<Date>(new Date());
  let [stats, setStats] = useState<StatsStatus>(buildEmptyStats());
  let [statsLoaded, setStatsLoaded] = useState<boolean>(false);
  let [socketState, setSocketState] = useState<
    "connected" | "connecting" | "closed"
  >("closed");
  let [playersOnline, setPlayersOnline] = useState<number>(0);
  let [socketGuessHandler, setSocketGuessHandler] = useState<
    (x: number, y: number, solvedState: SolveStatus | undefined) => void
  >(() => () => {});
  let [socketDisconnectCallback, setSocketDisconnectCallback] = useState<
    () => void
  >(() => () => {});
  const socketGuessObservable = useRef<Subject<{ x: number; y: number }>>(
    new Subject<{ x: number; y: number }>()
  );
  const socketRef = useRef<Socket<ServerEvent, ClientEvent> | null>(null);
  const statsLoadedRef = useRef<boolean>(false);
  const guessQueueRef = useRef<QueuedGuess[]>([]);
  const queueTimerRef = useRef<number | null>(null);
  const queueFlushInProgressRef = useRef<boolean>(false);

  let defaultLayout = {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    margin: {
      l: 0,
      r: 0,
      b: 0,
      t: 0,
      pad: 500,
    },
    xaxis: {
      autorange: false,
      showgrid: false,
      showticklabels: false,
      zerolinecolor: "rgba(255,255,255,0.1)",
      range: [-0.5, 0.5],
    },
    yaxis: {
      autorange: false,
      showgrid: false,
      showticklabels: false,
      // scaleanchor: "x",
      constraintoward: "center",
      zerolinecolor: "rgba(255,255,255,0.1)",
      range: [-0.28125, 0.28125],
    },
    dragmode: "pan",
    showlegend: false,
    uirevision: 1,
  };

  let [plotLayout, setPlotLayout] = useState<Plotly.Layout>(defaultLayout);

  useEffect(() => {
    // Reset state when language changes
    setParsedWords([]);
    setSecret(undefined);
    setGuesses([]);
    setLanguageDataAvailable(true);

    const langConfig = LANGUAGE_CONFIGS[language];
    const wordList: [string, number][] =
      language === "de"
        ? (wordListDe as [string, number][])
        : (wordListEn as [string, number][]);

    (async () => {
      let pimantleEpoch = dayjs("2026-07-07T03:00:00");
      let today = dayjs();

      let todaysPimantle = today.diff(pimantleEpoch, "days");

      let pimantleArchive: ArchiveLink[] = [];

      await migrateLocalStorage();

      for (let i = todaysPimantle - 1; i >= 0; i--) {
        let pimantleProgress = await loadProgress("pimantle", i);
        let pimantleSolved = localStorage.getItem(`pimantle-${i}-solved`);
        pimantleArchive.push({
          puzzleType: "pimantle",
          puzzleIndex: i,
          started: !!pimantleProgress,
          solved: !!pimantleSolved,
          guesses: (pimantleProgress && pimantleProgress.length) ?? 0,
        });
      }

      setArchivePimantles(pimantleArchive);

      let newPuzzleNumber = todaysPimantle;
      let puzzleType = "pimantle";

      const urlParams = new URLSearchParams(window.location.search);
      let urlPuzzleType = urlParams.get("type");
      let urlPuzzleIndex = parseInt(urlParams.get("puzzle") ?? "-1");

      // Bonus ("Zufälliges Quiz") puzzles live at a high fixed block.
      const BONUS_START = 900000;
      const BONUS_COUNT = 10;
      let isBonus =
        urlPuzzleIndex >= BONUS_START &&
        urlPuzzleIndex < BONUS_START + BONUS_COUNT;

      if (
        urlPuzzleIndex >= 0 &&
        urlPuzzleType?.startsWith("p") &&
        (urlPuzzleIndex < todaysPimantle || isBonus)
      ) {
        newPuzzleNumber = urlPuzzleIndex;
        setIsArchivePuzzle(true);
        document.title = isBonus
          ? `Pimantel Bonus #${newPuzzleNumber - BONUS_START + 1}`
          : `Pimantel Archiv: Pimantel #${newPuzzleNumber}`;
      }

      setNextPuzzleTime(pimantleEpoch.add(todaysPimantle + 1, "day").toDate());
      setPuzzleType("pimantle");

      setCurrentPuzzle(newPuzzleNumber.toString());
      window
        .fetch(
          `/${
            puzzleType === "pimantle"
              ? langConfig.secretWordsFolder
              : langConfig.semantleWordsFolder
          }/secret_word_${newPuzzleNumber}.bin?3`,
          { cache: "force-cache" }
        )
        .then((response) => {
          if (!response.ok) {
            setLanguageDataAvailable(false);
            return null;
          }
          return response.arrayBuffer();
        })
        .then((buffer) => {
          if (!buffer) return;
          if (wordList.length === 0) {
            setLanguageDataAvailable(false);
            return;
          }
          let dataView = new DataView(buffer);
          let offset = 4;
          let parsedWords: Word[] = [];
          let rank = 1;
          while (offset < buffer.byteLength) {
            let index = dataView.getUint32(offset, true);
            offset += 4;
            let x = dataView.getFloat32(offset, true);
            offset += 4;
            let y = dataView.getFloat32(offset, true);
            offset += 4;
            let similarity = getFloat16(dataView, offset, true) * 100;
            offset += 2;
            parsedWords.push({
              index: index,
              word: wordList[index][0] as string,
              frequency: wordList[index][1] as number,
              similarity: similarity,
              x: x,
              y: y,
              rank: rank,
            });
            rank++;
          }
          setSecret(parsedWords[0]);
          let newXValues = parsedWords.map((word) => word.x);
          setXValues(newXValues);
          let newYValues = parsedWords.map((word) => word.y);
          setYValues(newYValues);

          setPlotData([
            {
              x: newXValues,
              y: newYValues,
              text: parsedWords.map((word) => word.word),
              customdata: parsedWords.map((word) => [
                word.similarity.toFixed(2),
                word.rank,
              ]),
              mode: "markers",
              type: "scattergl",
              marker: {
                color: "darkblue",
                opacity: 0.8,
                // color: parsedWords.map((w) => Math.floor(w.rank / 100)),
                // color: parsedWords.map(
                //   (word) => word.rank / parsedWords.length
                // ),
              },
              hoverinfo: "skip",
            },
            {
              x: [parsedWords[0].x],
              y: [parsedWords[0].y],
              mode: "markers",
              type: "scatter",
              marker: {
                color: "yellow",
                size: 15,
                symbol: "star",
              },
              hovertemplate: "<b>Geheimwort</b><extra></extra>",
              hoverlabel: {
                font: {
                  family: "var(--body-font)",
                },
              },
            },
            {
              x: [],
              y: [],
              customdata: [],
              text: [],
              mode: "markers",
              type: "scatter",
              marker: {
                color: [],
                cmin: 0,
                cmid: 1000,
                cmax: parsedWords.length,
                size: 10,
                colorscale: "Portland",
                reversescale: true,
              },
              hoverlabel: {
                font: {
                  family: "var(--body-font)",
                },
              },
            hovertemplate:
                "<b>%{text}</b><br><br>Ähnlichkeit: %{customdata[0]}<br>Rang: %{customdata[1]}<br>Dein Tipp: %{customdata[2]}<extra></extra>",
            },
          ]);

          setParsedWords(parsedWords);
        });
    })();
  }, [language]);

  useEffect(() => {
    setDataRevision((old) => old + 1);
  }, [plotData, plotLayout]);

  useEffect(() => {
    statsLoadedRef.current = statsLoaded;
  }, [statsLoaded]);

  useEffect(() => {
    if (currentPuzzle === "?") {
      return;
    }

    const key = getStatsCacheKey(puzzleType, currentPuzzle);
    const cached = localStorage.getItem(key);
    if (!cached) {
      setStats(buildEmptyStats());
      setStatsLoaded(false);
      statsLoadedRef.current = false;
      return;
    }

    try {
      const parsed = JSON.parse(cached) as StatsStatus;
      setStats(parsed);
      setStatsLoaded(true);
      statsLoadedRef.current = true;
    } catch {
      setStats(buildEmptyStats());
      setStatsLoaded(false);
      statsLoadedRef.current = false;
    }
  }, [currentPuzzle, puzzleType]);

  useEffect(() => {
    if (
      !MULTIPLAYER_ENABLED ||
      isArchivePuzzle ||
      currentPuzzle === "?" ||
      parsedWords.length === 0
    ) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setSocketState("closed");
      setPlayersOnline(0);
      setSocketGuessHandler(() => () => {});
      setSocketDisconnectCallback(() => () => {});
      return;
    }

    if (localStorage.getItem("pimantle-offline")) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setSocketState("closed");
      setPlayersOnline(0);
      setSocketGuessHandler(() => () => {});
      setSocketDisconnectCallback(() => () => {});
      return;
    }

    const queueKey = getGuessQueueKey(puzzleType, currentPuzzle);
    try {
      const rawQueue = localStorage.getItem(queueKey);
      guessQueueRef.current = rawQueue
        ? (JSON.parse(rawQueue) as QueuedGuess[])
        : [];
    } catch {
      guessQueueRef.current = [];
    }

    const persistQueue = () => {
      localStorage.setItem(queueKey, JSON.stringify(guessQueueRef.current));
    };

    const flushQueue = () => {
      if (socket.connected === false) {
        return;
      }
      if (queueFlushInProgressRef.current) {
        return;
      }
      const nextGuess = guessQueueRef.current[0];
      if (!nextGuess) {
        return;
      }

      queueFlushInProgressRef.current = true;
      let finished = false;
      const timeoutId = window.setTimeout(() => {
        if (finished) {
          return;
        }
        finished = true;
        queueFlushInProgressRef.current = false;
      }, 8000);

      socket.emit(
        "guess",
        nextGuess.x,
        nextGuess.y,
        nextGuess.solveStatus,
        (ack: GuessAck) => {
          if (finished) {
            return;
          }
          finished = true;
          window.clearTimeout(timeoutId);
          queueFlushInProgressRef.current = false;

          if (ack && ack.ok) {
            guessQueueRef.current.shift();
            persistQueue();
            flushQueue();
          }
        }
      );
    };

    const playerIdStorageKey = "pimantel-player-id";
    let playerId = localStorage.getItem(playerIdStorageKey);
    if (!playerId) {
      playerId = generatePlayerId();
      localStorage.setItem(playerIdStorageKey, playerId);
    }

    const socket: Socket<ServerEvent, ClientEvent> = io(MULTIPLAYER_SOCKET_URL, {
      transports: ["websocket"],
      auth: {
        playerId,
      },
    });
    socketRef.current = socket;
    setSocketState("connecting");

    socket.on("connect", () => {
      setSocketState("connected");
      socket.emit("joinGame", `${puzzleType}-${currentPuzzle}`);
      flushQueue();
    });

    socket.on("disconnect", () => {
      setSocketState("closed");
      setPlayersOnline(0);
    });

    socket.io.on("reconnect_attempt", () => {
      setSocketState("connecting");
    });

    socket.io.on("reconnect_error", () => {
      setSocketState("closed");
    });

    socket.on("playerCount", (count: number) => {
      setPlayersOnline(count);
    });

    socket.on("newGuess", (x: number, y: number) => {
      socketGuessObservable.current.next({ x, y });
    });

    socket.on("guessWithStats", (x: number, y: number, update) => {
      socketGuessObservable.current.next({ x, y });
      if (!statsLoadedRef.current) {
        const nextStats = mapStatsUpdateToStatus(update, buildEmptyStats());
        setStats(nextStats);
        setStatsLoaded(true);
        localStorage.setItem(
          getStatsCacheKey(puzzleType, currentPuzzle),
          JSON.stringify(nextStats)
        );
      }
    });

    socket.on("statsUpdate", (update) => {
      if (!statsLoadedRef.current) {
        const nextStats = mapStatsUpdateToStatus(update, buildEmptyStats());
        setStats(nextStats);
        setStatsLoaded(true);
        localStorage.setItem(
          getStatsCacheKey(puzzleType, currentPuzzle),
          JSON.stringify(nextStats)
        );
      }
    });

    setSocketGuessHandler(
      () => (x: number, y: number, solvedState: SolveStatus | undefined) => {
        guessQueueRef.current.push({ x, y, solveStatus: solvedState });
        persistQueue();
        flushQueue();
      }
    );

    setSocketDisconnectCallback(() => () => {
      localStorage.setItem("pimantle-offline", "true");
      setSocketState("closed");
      socket.disconnect();
    });

    queueTimerRef.current = window.setInterval(() => {
      flushQueue();
    }, 10000);

    return () => {
      if (queueTimerRef.current !== null) {
        window.clearInterval(queueTimerRef.current);
        queueTimerRef.current = null;
      }
      queueFlushInProgressRef.current = false;
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
      socket.disconnect();
    };
  }, [currentPuzzle, parsedWords.length, isArchivePuzzle, puzzleType]);

  function centerPlot(on?: Word) {
    setBizarreEdgeCaseThingIHateIt((old) => old * -1);
    if (parsedWords) {
      let [xRange, yRange] = getAxisRange(
        on ? on : parsedWords[Math.floor(parsedWords.length / 2)]
      );

      xRange[0] += bizarreEdgeCaseThingIHateIt;
      xRange[1] += bizarreEdgeCaseThingIHateIt;
      yRange[0] += bizarreEdgeCaseThingIHateIt;
      yRange[1] += bizarreEdgeCaseThingIHateIt;

      setPlotLayout((prevState: Plotly.Layout) => ({
        ...prevState,
        xaxis: {
          ...prevState.xaxis,
          range: xRange,
        },
        yaxis: {
          ...prevState.yaxis,
          range: yRange,
        },
        uirevision: prevState.uirevision + 1,
      }));
      setDisplayedXRange(xRange);
      setDisplayedYRange(yRange);
    }
  }

  function getAxisRange(target: Word): number[][] {
    console.log("target", target);
    let plotBounds = document
      .getElementById("plot-div")
      ?.getBoundingClientRect();
    let safeBounds = document
      .getElementsByClassName("safe-container")?.[0]
      ?.getBoundingClientRect();

    let bufferSize = 1.5;

    console.log(plotBounds, safeBounds);

    if (plotBounds === undefined || safeBounds === undefined) {
      return [
        [-1, 1],
        [-1, 1],
      ];
    }

    let plotWidth = Math.max(plotBounds.width, 1);
    let plotHeight = Math.max(plotBounds.height, 1);

    let safeLeftMargin = (safeBounds.left - plotBounds.left) / plotWidth;
    let safeRightMargin = (plotBounds.right - safeBounds.right) / plotWidth;
    let safeTopMargin = (safeBounds.top - plotBounds.top) / plotHeight;
    let safeBottomMargin = (plotBounds.bottom - safeBounds.bottom) / plotHeight;

    let safeWidth = Math.max(1 - safeLeftMargin - safeRightMargin, 0.001);
    let safeHeight = Math.max(1 - safeTopMargin - safeBottomMargin, 0.001);

    let plotCenterX = (safeLeftMargin + (1 - safeRightMargin)) / 2;
    let plotCenterY = (safeTopMargin + (1 - safeBottomMargin)) / 2;

    setPlotCenter([plotCenterX, plotCenterY]);

    let rangeNeeded = Math.max(
      Math.sqrt(target.x * target.x + target.y * target.y) * bufferSize,
      0.025
    );

    let yAxisRange: number;
    let xAxisRange: number;

    if (plotHeight * safeHeight < plotWidth * safeWidth) {
      yAxisRange = rangeNeeded * 2 + rangeNeeded * 2 * (1 - safeHeight);
      xAxisRange = yAxisRange * (plotWidth / plotHeight);
    } else {
      xAxisRange = rangeNeeded * 2 + rangeNeeded * 2 * (1 - safeWidth);
      yAxisRange = xAxisRange * (plotHeight / plotWidth);
    }

    return [
      [-xAxisRange * plotCenterX, xAxisRange * (1 - plotCenterX)],
      [-yAxisRange * (1 - plotCenterY), yAxisRange * plotCenterY],
    ];
  }

  return (
    <div className="App">
      <ToastContainer
        position="top-left"
        hideProgressBar
        toastClassName="toast-blur"
        autoClose={5000}
        theme="dark"
      />
      {socketState === "connected" && (
        <MultiplayerBackground
          xRange={displayedXRange}
          yRange={displayedYRange}
          guessObservable={socketGuessObservable}
        />
      )}
      <div className="header">
        <span className="header-left" />
        <span
          className="header-link"
          onClick={() => setArchiveOpen(true)}
          title="Puzzle archive"
        >
          {puzzleType === "semantle" ? "Semantle" : "Pimantel"} #{currentPuzzle}{" "}
          {isArchivePuzzle && "(Archiv-Rätsel)"}
        </span>
        <span className="header-right">
          {MULTIPLAYER_ENABLED && !isArchivePuzzle && (
            <ServerPanel
              socketState={socketState}
              playersOnline={playersOnline}
              socketDisconnectCallback={socketDisconnectCallback}
            />
          )}
        </span>
      </div>
      <ArchiveDropdown
        isOpen={archiveOpen}
        close={() => setArchiveOpen(false)}
        archivePimantles={archivePimantles}
        frontendVersionLabel={buildFrontendVersionLabel()}
        frontendVersionUrl={FRONTEND_VERSION_URL}
      />
      <SettingsDropdown
        isOpen={settingsOpen}
        close={() => setSettingsOpen(false)}
      />
      {parsedWords.length > 0 && (
        <div className="game-container">
          <div className="layout-container">
            <Guesses
              guesses={guesses}
              setGuesses={setGuesses}
              parsedWords={parsedWords}
              puzzleType={puzzleType}
              currentPuzzle={currentPuzzle}
              stats={stats}
              statsLoaded={statsLoaded}
              socketState={socketState}
              socketGuessHandler={socketGuessHandler}
              scroller={scroller}
              hoverEnabled={hoverEnabled}
              plotData={plotData}
              setPlotData={setPlotData}
              isArchivePuzzle={isArchivePuzzle}
              defaultLayout={defaultLayout}
              secret={secret}
              nextPuzzleTime={nextPuzzleTime}
              centerPlot={centerPlot}
              language={language}
            />
            <div className="safe-container" />
          </div>

          <PlotContainer
            plotProperties={{ plotData, hoverEnabled }}
            parsedWords={parsedWords}
            plotLayout={plotLayout}
            revision={dataRevision}
            setDisplayedXRange={setDisplayedXRange}
            setDisplayedYRange={setDisplayedYRange}
            onInit={() => centerPlot}
          />
        </div>
      )}
      {parsedWords.length === 0 && languageDataAvailable && (
        <div className="loading-container">
          <div className="loading-text">
            Lade {puzzleType === "semantle" ? "Semantle" : "Pimantel"}...
          </div>
        </div>
      )}
      {!languageDataAvailable && (
        <div className="loading-container">
          <div className="language-unavailable">
            <h2>🚧 Noch nicht verfügbar</h2>
            <p>
              Für dieses Rätsel gibt es noch keine Daten. Schau bald wieder
              vorbei!
            </p>
          </div>
        </div>
      )}
      <div id={"hidden-plot"} />
    </div>
  );
}

export default App;
