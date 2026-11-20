//! The app's own log lines. An app started from Finder has nowhere to write
//! what goes wrong, so the host points its standard error at a file (platform
//! `app_log`); a line written with `note!` starts with when it was written,
//! so one moment's lines can be told from another's.
use chrono::{DateTime, Local, TimeZone};

/// When a line was written: the local date, the time to the millisecond and
/// the offset from UTC, as `2026-11-20 21:51:03.123 +0800`.
pub fn stamp_of<Tz: TimeZone>(time: &DateTime<Tz>) -> String
where
    Tz::Offset: std::fmt::Display,
{
    time.format("%Y-%m-%d %H:%M:%S%.3f %z").to_string()
}

/// `stamp_of` for now.
pub fn stamp() -> String {
    stamp_of(&Local::now())
}

/// A line for the app's log: `eprintln!` with the time in front.
#[macro_export]
macro_rules! note {
    ($($arg:tt)*) => {
        eprintln!("{} {}", $crate::app_log::stamp(), format_args!($($arg)*))
    };
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::FixedOffset;

    #[test]
    fn a_stamp_reads_as_local_time_to_the_millisecond_with_its_offset() {
        let beijing = FixedOffset::east_opt(8 * 3600).unwrap();
        let time = beijing.with_ymd_and_hms(2026, 11, 20, 21, 51, 3).unwrap()
            + chrono::Duration::milliseconds(123);
        assert_eq!(stamp_of(&time), "2026-11-20 21:51:03.123 +0800");
    }
}
