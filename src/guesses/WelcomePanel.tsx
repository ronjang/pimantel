export type WelcomePanelProperties = {
  isArchivePuzzle: boolean;
};

function WelcomePanel({ isArchivePuzzle }: WelcomePanelProperties) {
  return (
    <div className={`guess-entry bg-frigid`}>
      <h3>Willkommen bei Pimantel!</h3>
      <p>
        Versuche, {isArchivePuzzle ? "das" : "das heutige"} Geheimwort zu erraten. Je näher
        zur Mitte, desto semantisch ähnlicher ist dein Tipp.{" "}
      </p>
      <details>
        <summary>Mehr erfahren!</summary>
        <br />
        <h3>Semantische Ähnlichkeit</h3>
        <p>
          Pimantel verwendet dasselbe Bewertungssystem wie Semantle. Jedes Wort
          im Datensatz stammt aus{" "}
          <a href="https://de.wikipedia.org/wiki/Word2vec">word2vec</a>, einem
          maschinellen Lernmodell, das Wörter auf hochdimensionale Vektoren
          abbildet. Die{" "}
          <a href="https://de.wikipedia.org/wiki/Kosinus-%C3%84hnlichkeit">
            Kosinus-Ähnlichkeit
          </a>{" "}
          zwischen diesen Vektoren ist ein gutes Maß für semantische Ähnlichkeit.
          Das ist der Wert zwischen -1 und 1, den du neben jedem Tipp siehst.
        </p>
        <br />
        <h3>Die Karte</h3>
        <p>
          Pimantels einzigartiger Beitrag zum Genre der semantischen
          Ratespiele ist die interaktive Karte im Hintergrund. Es handelt sich
          um eine radiale Darstellung mit dem Zielwort in der Mitte. Der Radius
          entspricht der Kosinus-Ähnlichkeit, und &theta; entspricht einer
          1-D-{" "}
          <a href="https://de.wikipedia.org/wiki/T-distributed_Stochastic_Neighbor_Embedding">
            t-SNE
          </a>{" "}
          der Wortliste.
        </p>
        <br />
        <p>
          Wir fügen außerdem eine leichte Verdrehung hinzu, damit die Karte wie
          eine Spiralgalaxie aussieht, und schieben jeden Punkt in Richtung
          seiner nächsten Nachbarn, damit die Daten etwas cluster-artiger
          wirken. Deshalb scheinen manche Punkte manchmal außer der Reihe zu
          liegen.
        </p>
        <br />
        <p>
          Die Hoffnung ist, dass die Karte dir die logischen Pfade von deinen
          Tipps zum Zielwort zeigt. Vielleicht hast du eine Reihe von Tipps
          abgegeben, die alle entlang eines Arms liegen, der aber nicht wirklich
          die Mitte erreicht? In diesem Fall solltest du versuchen, entlang
          eines anderen Pfades zu raten.
        </p>
        <br />
        <h3>Hinweise</h3>
        <p>
          Gib genug Tipps ab und du schaltest den Hinweis-Button frei. Dieser
          verrät das Wort, das in der Rangliste auf halber Strecke zwischen
          deinen zwei besten Tipps liegt (wenn du also das 1000. und das 2000.
          ähnlichste Wort geraten hast, ist der Hinweis das 1500. ähnlichste
          Wort).
        </p>
        <br />
        <p>
          Benutze genug Hinweise und du schaltest „gute Hinweise" frei. Diese
          liegen auf halbem Weg zwischen deinem besten Tipp und dem Zielwort.
        </p>
        <br />
        <p>
          Hinweise sind nicht garantiert nützlich, aber sie sollen dein Denken
          in neue Bahnen lenken!
        </p>
        <br />
        <h3>Mehrspieler</h3>
        <p>
          Wenn du mit dem Server verbunden bist, siehst du die Tipps anderer
          Spieler sowie Radarblips auf der Karte. Wenn jemand das Geheimwort
          errät, erscheint ein Stern. Das ist nicht unbedingt nützlich, aber
          vielleicht motiviert es dich!
        </p>
        <br />
        <p>
          Wenn du auf einem leistungsschwächeren Gerät spielst, kann das
          Trennen vom Server (mit dem Button oben links) die Leistung verbessern.
        </p>
        <br />
        <h3>Wortliste</h3>
        <p>
          Die Liste der ratbaren Wörter stammt aus einer sorgfältigen
          Kombination mehrerer Datensätze, darunter word2vec, Wikipedia,
          Scrabble und weitere. Die täglichen Geheimwörter sind alle
          handverlesen. Entschuldigung.
        </p>
        <br />
        <hr />
      </details>
      <p>
        Bitte beachte, dass der Datensatz anstößige Wörter (einschließlich
        Schimpfwörter!) enthalten kann, die durch die „Hinweis"- und
        „Erkunden"-Funktionen auftauchen können.{" "}
      </p>
      <p>
        Diese Seite ist für Desktop optimiert. Sie funktioniert auch auf
        Mobilgeräten, aber es kann zu einigen Problemen kommen.
      </p>
      <p>
        Basiert auf{" "}
        <a
          href={"https://semantle.novalis.org/"}
          target={"_blank"}
          rel={"noreferrer"}
        >
          Semantle
        </a>
        {" "}und{" "}
        <a
          href={"https://semantle.pimanrul.es/"}
          target={"_blank"}
          rel={"noreferrer"}
        >
          Pimantle
        </a>
        {" "}von{" "}
        <a href={"https://pimanrul.es"} target={"_blank"} rel={"noreferrer"}>
          pimanrules
        </a>
        .
      </p>
    </div>
  );
}

export default WelcomePanel;
