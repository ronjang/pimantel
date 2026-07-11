import { useState } from "react";
import { StatsStatus } from "./stats.model";
import Plot from "react-plotly.js";

function StatsPanel({
  puzzleName,
  stats,
}: {
  puzzleName: string;
  stats: StatsStatus;
}) {
  let [pinned, setPinned] = useState(false);

  return (
    <div
      className={`guess-entry stats-box bg-frigid ${pinned ? "sticky" : ""}`}
    >
      <p>
        <b>{puzzleName} stats</b>
        {/*<input*/}
        {/*  type="button"*/}
        {/*  value={pinned ? "Unpin" : "Pin"}*/}
        {/*  onClick={() => setPinned((old) => !old)}*/}
        {/*/>*/}
      </p>
      <table>
        <thead>
          <tr>
            <th>Ø Tipps</th>
            <th>Bestes Ergebnis</th>
            <th>Spieler gelöst</th>
            <th>Spieler versucht</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              {stats.totalPlayersStarted > 0
                ? (stats.totalGuesses / stats.totalPlayersStarted).toFixed(1)
                : "--"}
            </td>
            <td>
              {stats.lowestSolveGuesses != null
                ? stats.lowestSolveGuesses.toLocaleString()
                : "--"}
            </td>
            <td>{stats.totalSolves.toLocaleString()}</td>
            <td>{stats.totalPlayersStarted.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
      <Plot
        data={[
          {
            type: "histogram",
            x: [
              0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 220, 240, 260,
              280, 300, 320, 340, 360, 380, 400, 420, 440, 460, 480, 500,
            ],
            y: stats.buckets,
            customdata: [1, 2, 3, 4, 5],
            histfunc: "sum",
            xbins: {
              start: 0,
              end: 500,
              size: 20,
            },
            marker: {
              color: "darkblue",
              line: {
                color: "#ffffff50",
                width: 1,
              },
            },
            hoverlabel: {
              font: {
                family: "var(--body-font)",
              },
            },
            hovertemplate: "<b>%{x}+ Tipps, %{y} Spieler</b><extra></extra>",
          },
        ]}
        layout={{
          dragmode: false,
          paper_bgcolor: "rgba(0,0,0,0)",
          plot_bgcolor: "rgba(0,0,0,0)",
          margin: {
            l: 0,
            r: 0,
            b: 0,
            t: 0,
            pad: 0,
          },

          width: 400,
          height: 150,
          xaxis: {
            range: [-1, 501],
          },
          yaxis: {
            showticklabels: false,
            showgrid: false,
          },
          shapes: [
            {
              type: "line",
              name: "Par",
              x0:
                stats.totalPlayersStarted === 0
                  ? 0
                  : stats.totalGuesses / stats.totalPlayersStarted,
              x1:
                stats.totalPlayersStarted === 0
                  ? 0
                  : stats.totalGuesses / stats.totalPlayersStarted,
              y0: 0,
              y1: 1,
              yref: "paper",
              fillcolor: "#ffff00",
              line: {
                color: "#ffff00",
                width: 2,
              },
            },
          ],
        }}
        config={{
          modeBarButtonsToRemove: [
            "zoomIn2d",
            "zoomOut2d",
            "zoom2d",
            "pan2d",
            "select2d",
            "lasso2d",
            "autoScale2d",
            "resetScale2d",
            "toImage",
          ],
          displaylogo: false,
          displayModeBar: true,
        }}
      />
    </div>
  );
}

export default StatsPanel;
