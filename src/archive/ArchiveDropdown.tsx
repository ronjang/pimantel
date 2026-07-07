import ArchiveTile, { ArchiveLink } from "./ArchiveLink";
import React from "react";

export type ArchiveDropdownProps = {
  isOpen: boolean;
  close: () => void;
  archivePimantles: ArchiveLink[];
  archiveSemantles: ArchiveLink[];
};

function ArchiveDropdown({
  isOpen,
  close,
  archivePimantles,
  archiveSemantles,
}: ArchiveDropdownProps) {
  return (
    <div className={`archive-overlay ${isOpen ? "archive-open" : ""}`}>
      <div className="archive-background" onClick={() => close()} />
      <div className="archive-container">
        <div className="close-button" onClick={() => close()}>
          ✕
        </div>
        <div className="archive-column">
          <h1 className="archive-heading">Heutige Rätsel</h1>
          <a href="/" className="todays-pimantle archive-puzzle">
            <div className="tile-title">Heutiges Pimantel</div>
          </a>
          <a
            href={"https://semantle.com/"}
            target={"_blank"}
            rel={"noreferrer"}
            className="todays-semantle archive-puzzle"
          >
            <div className="tile-title">Heutiges Semantle</div>
            <div className="semantle-footnote">(auf semantle.com)</div>
          </a>

          <h1 className="archive-heading">Pimantel-Archiv</h1>
          {archivePimantles.map((puzzle, index) => (
            <ArchiveTile link={puzzle} key={`pimantle-tile-${index}`} />
          ))}
        </div>

        <div className="archive-column">
          <h1 className="archive-heading">Weiteres</h1>
          <h2 className="archive-subheading">Quellcode</h2>
          <div className="social-panel">
            <a
              href="https://github.com/ronjang/pimantel"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                className="social-button"
                src="/socials/github.svg"
                alt="github"
              />
            </a>
          </div>
          <h1 className="archive-heading">Semantle-Archiv</h1>
          {archiveSemantles.map((puzzle, index) => (
            <ArchiveTile link={puzzle} key={`semantle-tile-${index}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default ArchiveDropdown;
