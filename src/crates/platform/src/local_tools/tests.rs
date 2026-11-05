use super::*;
use serde_json::json;
use std::time::{Duration, Instant};

/// A channel whose `slow` method takes `wait`, and whose other methods answer at once.
fn channel(directory: &Path, wait: Duration) -> Server {
    Server::start(
        directory,
        Arc::new(move |request: Value, _: &AtomicBool| {
            if request["method"] == "slow" {
                std::thread::sleep(wait);
            }
            json!({"id":request["id"],"result":request["method"]})
        }),
    )
    .unwrap()
}

#[test]
fn a_slow_request_does_not_hold_up_the_next_one() {
    // Leave room for the socket under macOS's long temp path.
    let temporary = tempfile::Builder::new().prefix("").tempdir().unwrap();
    let directory = temporary.path().join("t");
    let _server = channel(&directory, Duration::from_millis(1500));
    let slow_directory = directory.clone();
    let slow = std::thread::spawn(move || {
        request(&slow_directory, &json!({"id":1,"method":"slow"})).unwrap()
    });
    // Let the slow request reach its handler first.
    std::thread::sleep(Duration::from_millis(200));
    let started = Instant::now();
    let fast = request(&directory, &json!({"id":2,"method":"fast"})).unwrap();
    assert_eq!(fast, json!({"id":2,"result":"fast"}));
    assert!(
        started.elapsed() < Duration::from_millis(1000),
        "the second request waited {:?}",
        started.elapsed()
    );
    assert_eq!(slow.join().unwrap(), json!({"id":1,"result":"slow"}));
}

#[test]
fn a_caller_may_wait_longer_or_shorter_than_the_default() {
    let temporary = tempfile::Builder::new().prefix("").tempdir().unwrap();
    let directory = temporary.path().join("t");
    let _server = channel(&directory, Duration::from_millis(800));
    assert!(request_with_timeout(
        &directory,
        &json!({"id":1,"method":"slow"}),
        Duration::from_millis(100)
    )
    .is_err());
    assert_eq!(
        request_with_timeout(
            &directory,
            &json!({"id":2,"method":"slow"}),
            Duration::from_secs(5)
        )
        .unwrap()["result"],
        "slow"
    );
}
