import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useBoardInks } from "./panel/AgentBoard";
import { RETRY_AFTER_MS, failureAt, type Failures } from "./open-result";

/** The opens that just failed, by key: each says why a few seconds, then
 * may be tried again (#220). */
export function useOpenFailures() {
  const [failures, setFailures] = useState<Failures>(() => new Map());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);
  const fail = useCallback((key: string, reason: string) => {
    const until = Date.now() + RETRY_AFTER_MS;
    setFailures((previous) => new Map(previous).set(key, { reason, until }));
    clearTimeout(timers.current.get(key));
    // Only to draw the line again once it may be tried.
    timers.current.set(
      key,
      setTimeout(() => {
        timers.current.delete(key);
        setFailures((previous) => {
          const next = new Map(previous);
          next.delete(key);
          return next;
        });
      }, RETRY_AFTER_MS),
    );
  }, []);
  const failure = useCallback(
    (key: string) => failureAt(failures, key, Date.now()),
    [failures],
  );
  return { failure, fail };
}

/** Why an open failed, said in a line as a handoff's notice is. */
export function OpenNotice({
  text,
  light,
  style,
}: {
  text: string;
  light: boolean;
  style?: CSSProperties;
}) {
  const inks = useBoardInks(light);
  return (
    <span
      role="status"
      title={text}
      style={{
        display: "block",
        marginTop: 2,
        fontSize: 12,
        color: inks.red,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        minWidth: 0,
        ...style,
      }}
    >
      {text}
    </span>
  );
}
