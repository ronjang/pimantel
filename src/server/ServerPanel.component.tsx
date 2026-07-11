function ServerPanel({
  socketState,
  playersOnline,
  socketDisconnectCallback,
  frontendVersion,
  frontendVersionUrl,
}: {
  socketState: string;
  playersOnline: number;
  socketDisconnectCallback: () => void;
  frontendVersion: string;
  frontendVersionUrl: string;
}) {
  return (
    <div className="server-panel">
      {socketState === "connected" && (
        <>
          <span
            className="player-count"
            title="Spieler, die dieses Rätsel gerade lösen"
          >
            👤{playersOnline}
          </span>
          <input
            type="button"
            className="disconnect-button"
            value="Trennen"
            onClick={socketDisconnectCallback}
          />
        </>
      )}
      {socketState === "connecting" && (
        <span className="reconnecting">Verbinde...</span>
      )}

      {socketState === "closed" && (
        <input
          type="button"
          className="disconnect-button"
          value="Verbinden"
          onClick={() => {
            localStorage.removeItem("pimantle-offline");
            setTimeout(() => {
              window.location.reload();
            }, 150);
          }}
        />
      )}
      <a
        className="frontend-version"
        href={frontendVersionUrl}
        target="_blank"
        rel="noreferrer"
        title={`Frontend Version ${frontendVersion}`}
      >
        v{frontendVersion}
      </a>
    </div>
  );
}

export default ServerPanel;
