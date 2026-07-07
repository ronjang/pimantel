import saveAs from "file-saver";
import mergeImages from "merge-images";
// @ts-ignore
import Plotly from "plotly.js-gl2d-dist-min";
import { Dispatch, useState } from "react";
import Countdown from "react-countdown";
import { toast } from "react-toastify";
import { Word } from "../guesses/guesses.model";
import { getPuzzleName } from "../puzzle/puzzle.component";
import { PuzzleType } from "../puzzle/puzzle.model";

function Solved({
  guesses,
  puzzleType,
  currentPuzzle,
  plotData,
  defaultLayout,
  secret,
  setPlotData,
  puzzleSolved,
  nextPuzzleTime,
}: {
  guesses: Word[];
  puzzleType: PuzzleType;
  currentPuzzle: string;
  plotData: Plotly.Data[];
  defaultLayout: any;
  secret: Word | undefined;
  setPlotData: Dispatch<React.SetStateAction<Plotly.Data[]>>;
  puzzleSolved: boolean;
  nextPuzzleTime: Date;
}) {
  let [downloadingImage, setDownloadingImage] = useState<boolean>(false);
  let [socialImage, setSocialImage] = useState<string>("");
  let [exploreMode, setExploreMode] = useState<boolean>(false);
  function getSolvedText() {
    let hintCount = getHintCount();
    let hintText = "";
    if (hintCount == 0) {
      hintText = "ohne Hinweise";
    } else if (hintCount == 1) {
      hintText = "mit 1 Hinweis";
    } else {
      hintText = `mit ${hintCount} Hinweisen`;
    }

    let extraText = puzzleType == "semantle" ? "(auf Pimantel) " : "";
    return `${getPuzzleName(puzzleType, currentPuzzle)} ${extraText}gelöst mit ${
      guesses.length
    } ${guesses.length > 1 ? "Tipps" : "Tipp"} und ${hintText}!`;
  }

  function getHintCount() {
    return guesses.filter((guess) => guess.isHint).length;
  }

  function generateImage(): Promise<string> {
    if (socialImage !== "") {
      return Promise.resolve(socialImage);
    } else {
      setDownloadingImage(true);
      toast(
        "Generating image, einen Moment... (funktioniert in manchen Browsern nicht perfekt)."
      );
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(
            Plotly.newPlot("hidden-plot", [plotData[0]], {
              ...defaultLayout,
              plot_bgcolor: "rgba(0,0,0,255)",
            })
              .then((figure: any) =>
                Plotly.toImage(figure, {
                  format: "png",
                  width: 1920,
                  height: 1080,
                })
              )
              .then((bgLayer: string) =>
                Plotly.react(
                  "hidden-plot",
                  [plotData[1], plotData[2]],
                  defaultLayout
                ).then((newPlot: any) =>
                  Plotly.toImage(newPlot, {
                    format: "png",
                    width: 1920,
                    height: 1080,
                  }).then((foregroundLayer: string) => {
                    Plotly.purge("hidden-plot");
                    return mergeImages([bgLayer, foregroundLayer]).then(
                      (merged) => {
                        setSocialImage(merged);
                        setDownloadingImage(false);
                        return merged;
                      }
                    );
                  })
                )
              )
          );
        }, 100);
      });
    }
  }

  function getImageBlob() {
    return generateImage()
      .then((image: string) => fetch(image))
      .then((response: Response) => response.blob());
  }

  function downloadVictory() {
    getImageBlob().then((blob) => {
      saveAs(blob, `${puzzleType}-${currentPuzzle}.png`);
    });
  }

  function shareVictory(withImage: boolean) {
    let shareObject = {
      url: window.location.href,
      text: getShareString(),
    };
    let errorMessage =
      'Share leider nicht möglich. Versuch die "Copy"-Buttons?';

    if (withImage) {
      getImageBlob().then((blob: Blob) => {
        let file = new File([blob], `${puzzleType}-${currentPuzzle}.png`, {
          type: blob.type,
        });
        if (navigator.canShare({ files: [file] })) {
          console.log("it supports image");
          navigator.share({
            ...shareObject,
            files: [file],
          });
        } else {
          navigator.share(shareObject).catch((err) => {
            toast.error(errorMessage);
          });
        }
      });
    } else {
      navigator.share(shareObject).catch((err) => {
        toast.error(errorMessage);
      });
    }
  }

  function getShareString() {
    return `I ${getSolvedText()}`;
  }

  function copyVictory(withImage: boolean) {
    if (navigator.clipboard === undefined) {
      toast.error("Dein Browser unterstützt Copy to Clipboard leider nicht.");
    }
    let shareText = getShareString() + "\n\n" + window.location.href;
    let textBlob = new Blob([shareText], { type: "text/plain" });
    if (withImage) {
      getImageBlob().then((iamgeBlob) => {
        navigator.clipboard
          .write([
            new ClipboardItem({
              [iamgeBlob.type]: iamgeBlob,
              [textBlob.type]: textBlob,
            }),
          ])
          .then(() => {
            toast.success("Copied to clipboard!");
          })
          .catch(() => {
            toast.error(
              'Copy leider fehlgeschlagen. Versuch "Copy (text)"?'
            );
          });
      });
    } else {
      (navigator.clipboard.write
        ? navigator.clipboard.write([
            new ClipboardItem({
              [textBlob.type]: textBlob,
            }),
          ])
        : navigator.clipboard.writeText(shareText)
      )
        .then(() => {
          toast.success("Copied to clipboard!");
        })
        .catch(() => {
          toast.error("Copy leider fehlgeschlagen.");
        });
    }
  }

  function explore() {
    setExploreMode(true);
    setPlotData((oldData) => [
      {
        ...oldData[0],
        hovertemplate:
          "<b>%{text}</b><br><br>Ähnlichkeit: %{customdata[0]}<br>Rang: %{customdata[1]}<extra></extra>",
      },
      oldData[1],
      oldData[2],
    ]);
    toast.warn(
      "Erkunden-Modus aktiviert. Du kannst jetzt über alle Punkte hovern, um ihre Ähnlichkeit zu sehen.\n\nWARNUNG: Der Datensatz enthält anstößige Wörter, einschließlich Schimpfwörter.",
      {
        autoClose: false,
        position: "top-center",
      }
    );
  }

  // ── Bonus "Zufälliges Quiz" puzzles ──────────────────────────────
  const BONUS_START = 900000;
  const BONUS_COUNT = 10;
  const BONUS_PLAYED_KEY = "pimantel-bonus-played";

  function getPlayedBonuses(): number[] {
    try {
      const raw = localStorage.getItem(BONUS_PLAYED_KEY);
      return raw ? (JSON.parse(raw) as number[]) : [];
    } catch {
      return [];
    }
  }

  const currentIsBonus =
    parseInt(currentPuzzle) >= BONUS_START &&
    parseInt(currentPuzzle) < BONUS_START + BONUS_COUNT;

  const playedBonuses = getPlayedBonuses();
  const remainingBonuses = BONUS_COUNT - playedBonuses.length;

  function playRandomBonus() {
    const played = getPlayedBonuses();
    // Remember the just-solved bonus puzzle so it isn't replayed.
    if (currentIsBonus && !played.includes(parseInt(currentPuzzle))) {
      played.push(parseInt(currentPuzzle));
    }
    const remaining: number[] = [];
    for (let i = 0; i < BONUS_COUNT; i++) {
      const n = BONUS_START + i;
      if (!played.includes(n)) remaining.push(n);
    }
    if (remaining.length === 0) {
      localStorage.setItem(BONUS_PLAYED_KEY, JSON.stringify(played));
      toast.info("Du hast alle Bonus-Rätsel gespielt! Komm morgen wieder. 🎉");
      return;
    }
    const next = remaining[Math.floor(Math.random() * remaining.length)];
    localStorage.setItem(BONUS_PLAYED_KEY, JSON.stringify(played));
    window.location.href = `/?type=pimantle&puzzle=${next}`;
  }

  return (
    <div className="solved-container">
      <div className="congrats-text guess-entry bg-correct">
        <span>
          Geschafft! {getSolvedText()} Das Geheimwort war{" "}
          <b>{secret?.word}</b>. Nächstes Rätsel in{" "}
          <Countdown date={nextPuzzleTime} daysInHours={true} />.
        </span>
      </div>
      <div className="reward-buttons">
        {remainingBonuses > 0 ? (
          <input
            onClick={playRandomBonus}
            type="button"
            className="bonus-quiz-button"
            value={`Zufälliges Quiz (${remainingBonuses})`}
          />
        ) : (
          <span className="bonus-quiz-done">
            Alle Bonus-Rätsel gespielt 🎉
          </span>
        )}
        {typeof navigator.canShare !== "undefined" &&
          navigator.canShare({ text: "test" }) && (
            <div>
              <input
                onClick={() => shareVictory(false)}
                type="button"
                value="Share (text)"
              />
              <input
                onClick={() => shareVictory(true)}
                disabled={downloadingImage}
                type="button"
                value="Share (text+image)"
              />
            </div>
          )}

        <input
          onClick={() => copyVictory(false)}
          type="button"
          value="Copy (text)"
        />
        <input
          onClick={() => copyVictory(true)}
          type="button"
          value="Copy (image)"
        />
        <input
          onClick={() => downloadVictory()}
          disabled={downloadingImage}
          type="button"
          value="Download"
        />
        {exploreMode || (
          <input onClick={() => explore()} type="button" value="Explore" />
        )}
      </div>
      {downloadingImage && (
        <div className="downloading">Einen Moment, Bild wird generiert...</div>
      )}
    </div>
  );
}

export default Solved;
