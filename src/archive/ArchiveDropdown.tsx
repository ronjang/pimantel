import ArchiveTile, { ArchiveLink } from "./ArchiveLink";
import React from "react";

export type ArchiveDropdownProps = {
  isOpen: boolean;
  close: () => void;
  archivePimantles: ArchiveLink[];
};

function ArchiveDropdown({
  isOpen,
  close,
  archivePimantles,
}: ArchiveDropdownProps) {
  return (
    <div className={`archive-overlay ${isOpen ? "archive-open" : ""}`}>
      <div className="archive-background" onClick={() => close()} />
      <div className="archive-container">
        <div className="close-button" onClick={() => close()}>
          ✕
        </div>
        <div className="archive-column">
          <h1 className="archive-heading">Daily Puzzles</h1>
          <a href="/" className="todays-pimantle archive-puzzle">
            <div className="tile-title">Heutiges Pimantel</div>
          </a>
          <a
            href={"https://semantle.pimanrul.es/"}
            target={"_blank"}
            rel={"noreferrer"}
            className="todays-semantle archive-puzzle"
          >
            <div className="tile-title">Today&apos;s Pimantle</div>
            <div className="semantle-footnote">(English, auf pimanrul.es)</div>
          </a>

          <h1 className="archive-heading">Pimantel-Archiv</h1>
          {archivePimantles.map((puzzle, index) => (
            <ArchiveTile link={puzzle} key={`pimantle-tile-${index}`} />
          ))}
        </div>

        <div className="archive-column">
          <h1 className="archive-heading">Links</h1>
          <h2 className="archive-subheading">Created by</h2>
          <div className="social-panel">
            <a
              href="https://manjang.de"
              target="_blank"
              rel="noopener noreferrer"
              className="archive-text-link"
            >
              manjang.de
            </a>
            <a
              href="https://github.com/ronjang/pimantel"
              target="_blank"
              rel="noopener noreferrer"
              className="archive-text-link"
            >
              GitHub
            </a>
          </div>
          <h2 className="archive-subheading">Based on</h2>
          <div className="social-panel">
            <a
              href="https://semantle.pimanrul.es"
              target="_blank"
              rel="noopener noreferrer"
              className="archive-text-link"
            >
              Pimantle von pimanrules
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ArchiveDropdown;
