/** How the sidebar learns whether 随手记's window shows (host float_notes). */
export interface FloatNotesBridge {
  /** Whether the window shows now. */
  ask: () => Promise<boolean>;
  /** Each time the host shows or hides the window, the 收起 inside the page
   * included. Resolves to the call that stops listening. */
  follow: (heard: (shown: boolean) => void) => Promise<() => void>;
}

/** Keeps the pendant's halo on the window's real state (#224): asks once, so
 * a reloaded sidebar starts right, then follows every show and hide the host
 * reports. An answer that arrives after a newer event is dropped. Returns the
 * call that stops watching. */
export function watchFloatNotes(
  bridge: FloatNotesBridge,
  show: (shown: boolean) => void,
): () => void {
  let stopped = false;
  let heard = false;
  const unlisten = bridge.follow((shown) => {
    if (stopped) return;
    heard = true;
    show(shown);
  });
  bridge.ask().then(
    (shown) => {
      if (!stopped && !heard) show(shown);
    },
    () => {},
  );
  return () => {
    stopped = true;
    void unlisten.then((stop) => stop()).catch(() => {});
  };
}
