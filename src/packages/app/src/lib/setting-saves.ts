/** One save at a time, in the order they were asked for: a switch clicked
 * while another setting saves waits its turn instead of being dropped
 * (#224). Each caller's promise settles with its own save; a failed save
 * does not stop the ones queued after it. */
export function settingSaves(
  run: (key: string, value: unknown) => Promise<void>,
): (key: string, value: unknown) => Promise<void> {
  let tail: Promise<void> = Promise.resolve();
  return (key, value) => {
    const next = tail.then(() => run(key, value));
    tail = next.catch(() => {});
    return next;
  };
}
