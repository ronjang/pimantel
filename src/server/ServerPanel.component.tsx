function ServerPanel({
  socketState,
  playersOnline,
  socketDisconnectCallback,
}: {
  socketState: string;
  playersOnline: number;
  socketDisconnectCallback: () => void;
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
    </div>
  );
}

export default ServerPanel;
