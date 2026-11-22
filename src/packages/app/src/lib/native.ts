// The one way the front end reaches the host's commands and events (7b):
// names come from @agent-hud/protocol, so a typo or a name the host does not
// know fails the type check instead of failing quietly at run time.
import type { Command } from "@agent-hud/protocol/commands";
import type { AppEvent } from "@agent-hud/protocol/events";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import {
  emit,
  listen,
  type EventCallback,
  type Options,
  type UnlistenFn,
} from "@tauri-apps/api/event";

export function call<T = unknown>(
  command: Command,
  args?: Record<string, unknown>,
): Promise<T> {
  return invoke<T>(command, args);
}

export function listenTo<T>(
  event: AppEvent,
  handler: EventCallback<T>,
  options?: Options,
): Promise<UnlistenFn> {
  return listen<T>(event, handler, options);
}

/** Events sent to this window only, as its own `listen` hears them. */
export function listenHere<T>(
  event: AppEvent,
  handler: EventCallback<T>,
): Promise<UnlistenFn> {
  return getCurrentWebviewWindow().listen<T>(event, handler);
}

export function emitTo(event: AppEvent, payload?: unknown): Promise<void> {
  return emit(event, payload);
}
