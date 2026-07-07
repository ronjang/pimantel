import { useState } from "react";

export type WelcomePanelProperties = {
  isArchivePuzzle: boolean;
};

function WelcomePanel({ isArchivePuzzle }: WelcomePanelProperties) {
  const [open, setOpen] = useState<boolean>(true);

  return (
    <div className={`guess-entry welcome-panel bg-frigid`}>
      <div className="welcome-header">
        <h3>Willkommen bei Pimantel!</h3>
        <button
          className="welcome-toggle"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          {open ? "Ausblenden ✕" : "Anleitung ▾"}
        </button>
      </div>

      {open && (
        <div className="welcome-body">
          <p>
            Errate {isArchivePuzzle ? "das" : "das heutige"} Geheimwort. Je
            näher an der Mitte, desto ähnlicher dein Tipp.
          </p>
          <ul>
            <li>
              <b>Umlaute:</b> „ä/ö/ü/ß" oder „ae/oe/ue/ss" – Groß-/Kleinschreibung
              egal.
            </li>
            <li>Folge den „Armen" der Karte Richtung Zentrum.</li>
            <li>Nach genug Tipps schaltest du <b>Hinweise</b> frei.</li>
          </ul>
          <p className="welcome-credits">
            Deutsche Version von{" "}
            <a href="https://manjang.de" target="_blank" rel="noreferrer">
              Ronny Manjang
            </a>{" "}
            ·{" "}
            <a
              href="https://github.com/ronjang/pimantel"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>{" "}
            · basiert auf{" "}
            <a
              href="https://semantle.pimanrul.es/"
              target="_blank"
              rel="noreferrer"
            >
              Pimantle
            </a>
            .
          </p>
        </div>
      )}
    </div>
  );
}

export default WelcomePanel;
