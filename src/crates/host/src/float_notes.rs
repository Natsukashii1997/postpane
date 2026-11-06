//! Digital World's 随手记 (floating notes), embedded as it is: the HUD shows
//! the notes' own ball, and a click opens the notes' own page, served by the
//! Digital World app on this machine, in a window beside it. The page draws
//! its own panel; PostPane adds no frame. The window gets no IPC: it is in no
//! capability, and it may only show that page (or the note shown while the
//! Digital World app is not running).
use std::{net::TcpStream, time::Duration};
use tauri::{Manager, WebviewUrl, WebviewWindow};

const LABEL: &str = "float-notes";
const HOST: &str = "127.0.0.1";
const PORT: u16 = 5178;
const PAGE: &str = "http://127.0.0.1:5178/?floatingNotes=1#/float";
/// The panel the notes app opens, in points.
const WIDTH: f64 = 368.0;
const HEIGHT: f64 = 600.0;
/// From the ball to the panel, and from the panel to the screen's edges.
const GAP: f64 = 8.0;
const MARGIN: f64 = 12.0;
/// The page asks for this address when its 收起 is pressed; the window hides.
const COLLAPSE: &str = "postpane-notes://collapse";
/// The page tells only Digital World's own shell that it was folded away;
/// anywhere else it fills the window with an "打开便签栏" button. This keeps
/// that button unpainted and, each time the page folds, asks that the window
/// hide. It hides by class, not on the element: the page reuses that element
/// for the panel. The observer changes no nodes: WebKit keeps delivering
/// records until none are left, so a change made there would loop forever.
const COLLAPSE_SCRIPT: &str = r#"(()=>{const sheet=new CSSStyleSheet();sheet.replaceSync(".fn-standalone-collapsed{visibility:hidden}");document.adoptedStyleSheets=[...document.adoptedStyleSheets,sheet];let folded=false;new MutationObserver(()=>{const now=!!document.querySelector(".fn-standalone-collapsed");if(now&&!folded)location.href="postpane-notes://collapse";folded=now;}).observe(document,{childList:true,subtree:true});})();"#;
/// The page's own call for its host showing it again: the panel comes back.
const RESTORE_SCRIPT: &str = "window.floatingNotesHost?.focus?.()";

#[derive(Clone, Copy, Debug, PartialEq, serde::Deserialize)]
pub(crate) struct Rect {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

/// Where the panel opens for a ball at `ball` on a screen whose usable area
/// is `area` (both in points, y down): beside the ball, toward the middle of
/// the screen, its top level with the ball's, kept inside the screen.
pub(crate) fn panel_frame(ball: Rect, area: Rect) -> Rect {
    let width = WIDTH.min(area.width - 2.0 * MARGIN).max(1.0);
    let height = HEIGHT.min(area.height - 2.0 * MARGIN).max(1.0);
    let toward_left = ball.x + ball.width / 2.0 >= area.x + area.width / 2.0;
    let x = if toward_left {
        ball.x - GAP - width
    } else {
        ball.x + ball.width + GAP
    };
    let clamp = |value: f64, low: f64, high: f64| value.min(high).max(low);
    Rect {
        x: clamp(x, area.x + MARGIN, area.x + area.width - width - MARGIN),
        y: clamp(
            ball.y,
            area.y + MARGIN,
            area.y + area.height - height - MARGIN,
        ),
        width,
        height,
    }
}

/// Whether the window may show `url`: the notes page itself, or the note
/// shown while the Digital World app is away.
pub(crate) fn allowed(url: &tauri::Url) -> bool {
    match url.scheme() {
        "data" => true,
        "http" => {
            url.host_str() == Some(HOST)
                && url.port() == Some(PORT)
                && url.path() == "/"
                && url
                    .query_pairs()
                    .any(|(key, value)| key == "floatingNotes" && value == "1")
        }
        _ => false,
    }
}

/// The Digital World app's own pages (its "在数码世界打开" link) open in the
/// browser, never inside the notes window.
fn is_digital_world(url: &tauri::Url) -> bool {
    url.scheme() == "http" && url.host_str() == Some(HOST) && url.port() == Some(PORT)
}

fn is_collapse(url: &tauri::Url) -> bool {
    url.as_str() == COLLAPSE
}

fn reachable() -> bool {
    let address = std::net::SocketAddr::from(([127, 0, 0, 1], PORT));
    TcpStream::connect_timeout(&address, Duration::from_millis(300)).is_ok()
}

/// Shown while nothing answers on the notes' port, as the notes app itself
/// says it; 重试 opens the page once the Digital World app answers.
fn away_page() -> String {
    let html = format!(
        r#"<!doctype html><html lang="zh-CN"><meta charset="utf-8"><style>
*{{box-sizing:border-box}}html,body{{margin:0;height:100%;background:transparent;font:14px -apple-system,"PingFang SC",sans-serif;color:#e9eeff}}
.p{{height:100%;border:1px solid rgba(140,178,255,.19);border-radius:14px;overflow:hidden;display:grid;grid-template-rows:52px 1fr 44px;background:linear-gradient(#152039,#0f1729 40%,#0c1325)}}
header,footer{{display:flex;align-items:center;padding:0 16px}}header{{border-bottom:1px solid rgba(140,178,255,.11);font-weight:600;font-size:16px}}
main{{padding:64px 32px;text-align:center;color:#b4bfda;line-height:1.65}}footer{{border-top:1px solid rgba(140,178,255,.11);color:#8b98b8;font-size:13px}}
button{{min-height:44px;border-radius:8px;border:1px solid rgba(140,178,255,.32);background:none;color:#e9eeff;margin-top:16px;padding:0 16px;font:inherit;cursor:pointer}}
</style><div class="p"><header>随手记</header><main><p>数码世界还没有启动</p><p id="m"></p><button id="r">重试</button></main><footer>等待连接数码世界</footer></div>
<script>const u="{PAGE}";document.getElementById("r").onclick=()=>fetch(u,{{mode:"no-cors"}}).then(()=>location.href=u).catch(()=>document.getElementById("m").textContent="还没连上，启动数码世界后再点重试");</script></html>"#
    );
    format!("data:text/html;charset=utf-8,{}", percent_encode(&html))
}

fn percent_encode(text: &str) -> String {
    let mut out = String::with_capacity(text.len() * 2);
    for byte in text.bytes() {
        if byte.is_ascii_alphanumeric() || b"-_.~".contains(&byte) {
            out.push(byte as char);
        } else {
            out.push_str(&format!("%{byte:02X}"));
        }
    }
    out
}

fn start_url() -> Result<tauri::Url, String> {
    let url = if reachable() {
        PAGE.to_owned()
    } else {
        away_page()
    };
    url.parse().map_err(|error| format!("{error}"))
}

/// Opens the notes beside the ball at `anchor` (points, in the calling HUD
/// window's page), or hides them when they are showing.
#[tauri::command]
pub(crate) async fn toggle_float_notes(
    window: WebviewWindow,
    anchor: Rect,
) -> Result<bool, String> {
    let app = window.app_handle().clone();
    if let Some(notes) = app.get_webview_window(LABEL) {
        if notes.is_visible().map_err(|error| error.to_string())? {
            notes.hide().map_err(|error| error.to_string())?;
            return Ok(false);
        }
    }
    let scale = window.scale_factor().map_err(|error| error.to_string())?;
    let origin = window
        .inner_position()
        .map_err(|error| error.to_string())?
        .to_logical::<f64>(scale);
    let ball = Rect {
        x: origin.x + anchor.x,
        y: origin.y + anchor.y,
        ..anchor
    };
    let monitor = window
        .current_monitor()
        .map_err(|error| error.to_string())?
        .ok_or("The HUD's screen is unavailable")?;
    let work = monitor.work_area();
    let monitor_scale = monitor.scale_factor();
    let position = work.position.to_logical::<f64>(monitor_scale);
    let size = work.size.to_logical::<f64>(monitor_scale);
    let frame = panel_frame(
        ball,
        Rect {
            x: position.x,
            y: position.y,
            width: size.width,
            height: size.height,
        },
    );
    let notes = match app.get_webview_window(LABEL) {
        Some(notes) => {
            // Each opening looks again whether the Digital World app answers.
            let showing = notes.url().map_err(|error| error.to_string())?;
            let wanted = start_url()?;
            if showing.scheme() != wanted.scheme() {
                notes.navigate(wanted).map_err(|error| error.to_string())?;
            }
            notes
        }
        None => tauri::WebviewWindowBuilder::new(&app, LABEL, WebviewUrl::External(start_url()?))
            .title("随手记")
            .decorations(false)
            .resizable(false)
            .maximizable(false)
            .minimizable(false)
            .transparent(true)
            .background_color(tauri::window::Color(0, 0, 0, 0))
            .shadow(true)
            .skip_taskbar(true)
            .always_on_top(true)
            .visible_on_all_workspaces(true)
            .visible(false)
            .initialization_script(COLLAPSE_SCRIPT)
            .on_navigation({
                let app = app.clone();
                move |url| {
                    if is_collapse(url) {
                        let handle = app.clone();
                        let _ = app.run_on_main_thread(move || {
                            if let Some(notes) = handle.get_webview_window(LABEL) {
                                let _ = notes.hide();
                                let _ = notes.eval(RESTORE_SCRIPT);
                            }
                        });
                        return false;
                    }
                    allowed(url)
                }
            })
            .on_new_window(|url, _| {
                if is_digital_world(&url) {
                    let _ = crate::shell::open_in_browser(url.as_str());
                }
                tauri::webview::NewWindowResponse::Deny
            })
            .build()
            .map_err(|error| format!("Could not open 随手记: {error}"))?,
    };
    notes
        .set_size(tauri::LogicalSize::new(frame.width, frame.height))
        .map_err(|error| error.to_string())?;
    notes
        .set_position(tauri::LogicalPosition::new(frame.x, frame.y))
        .map_err(|error| error.to_string())?;
    notes.show().map_err(|error| error.to_string())?;
    notes.set_focus().map_err(|error| error.to_string())?;
    Ok(true)
}

#[cfg(test)]
mod tests {
    use super::*;

    const SCREEN: Rect = Rect {
        x: 0.0,
        y: 25.0,
        width: 1440.0,
        height: 850.0,
    };
    const fn ball(x: f64, y: f64) -> Rect {
        Rect {
            x,
            y,
            width: 52.0,
            height: 52.0,
        }
    }

    #[test]
    fn a_ball_on_the_right_edge_opens_the_panel_to_its_left_level_with_it() {
        let frame = panel_frame(ball(1382.0, 200.0), SCREEN);
        assert_eq!(
            frame,
            Rect {
                x: 1382.0 - 8.0 - 368.0,
                y: 200.0,
                width: 368.0,
                height: 600.0
            }
        );
    }

    #[test]
    fn a_ball_on_the_left_edge_opens_the_panel_to_its_right() {
        let frame = panel_frame(ball(6.0, 200.0), SCREEN);
        assert_eq!(frame.x, 6.0 + 52.0 + 8.0);
    }

    #[test]
    fn a_ball_low_on_the_screen_lifts_the_panel_inside_it() {
        let frame = panel_frame(ball(1382.0, 800.0), SCREEN);
        assert_eq!(frame.y, 25.0 + 850.0 - 600.0 - 12.0);
    }

    #[test]
    fn a_small_screen_shrinks_the_panel() {
        let small = Rect {
            x: 0.0,
            y: 0.0,
            width: 800.0,
            height: 420.0,
        };
        let frame = panel_frame(ball(740.0, 100.0), small);
        assert_eq!((frame.width, frame.height), (368.0, 396.0));
        assert_eq!(frame.y, 12.0);
    }

    #[test]
    fn only_the_notes_page_and_the_away_note_may_load() {
        let ok = |url: &str| allowed(&url.parse().unwrap());
        assert!(ok(PAGE));
        assert!(ok("http://127.0.0.1:5178/?floatingNotes=1&noteId=7#/float"));
        assert!(ok(&away_page()));
        assert!(!ok("http://127.0.0.1:5178/#notes"));
        assert!(!ok("http://127.0.0.1:5179/?floatingNotes=1"));
        assert!(!ok("http://localhost:5178/?floatingNotes=1"));
        assert!(!ok("https://example.com/?floatingNotes=1"));
        assert!(!ok("file:///etc/hosts"));
    }

    #[test]
    fn folding_the_page_away_asks_to_hide_and_never_loads() {
        let collapse: tauri::Url = COLLAPSE.parse().unwrap();
        assert!(is_collapse(&collapse));
        assert!(!allowed(&collapse));
        assert!(COLLAPSE_SCRIPT.contains(COLLAPSE));
        assert!(!is_collapse(&PAGE.parse().unwrap()));
    }

    #[test]
    fn the_digital_world_link_goes_to_the_browser() {
        assert!(is_digital_world(
            &"http://127.0.0.1:5178/#notes".parse().unwrap()
        ));
        assert!(!is_digital_world(&"https://example.com/".parse().unwrap()));
    }
}
