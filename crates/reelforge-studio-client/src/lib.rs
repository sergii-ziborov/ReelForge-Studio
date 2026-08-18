//! Thin HTTP client for ReelForge-Host JSON-RPC MCP.
//!
//! No ONNX, no ffmpeg, no Intelligence crates. The GUI / mcport shim only
//! POST to `Host.serve --http`.

#![allow(clippy::doc_markdown)]

use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::io::{Read, Write};
use std::net::TcpStream;
use std::time::Duration;

/// Client error.
#[derive(Debug, thiserror::Error)]
pub enum ClientError {
    /// Transport / parse.
    #[error("{0}")]
    Message(String),
    /// JSON-RPC error object.
    #[error("rpc {code}: {message}")]
    Rpc {
        /// JSON-RPC code.
        code: i64,
        /// Message.
        message: String,
    },
}

impl ClientError {
    fn message(msg: impl Into<String>) -> Self {
        Self::Message(msg.into())
    }
}

/// Result alias.
pub type Result<T> = std::result::Result<T, ClientError>;

/// Default Host HTTP bind.
pub const DEFAULT_HOST: &str = "http://127.0.0.1:8787";

/// Host HTTP MCP client.
#[derive(Debug, Clone)]
pub struct HostClient {
    /// `host:port` (no scheme).
    pub host: String,
    /// Optional bearer token.
    pub token: Option<String>,
    /// Read/write timeout.
    pub timeout: Duration,
}

impl Default for HostClient {
    fn default() -> Self {
        Self::from_url(DEFAULT_HOST, None)
    }
}

impl HostClient {
    /// Parse `http://127.0.0.1:8787` or `127.0.0.1:8787`.
    #[must_use]
    pub fn from_url(url: &str, token: Option<String>) -> Self {
        let host = url
            .trim()
            .trim_start_matches("http://")
            .trim_start_matches("https://")
            .trim_end_matches('/')
            .to_owned();
        Self {
            host,
            token: token.filter(|t| !t.trim().is_empty()),
            timeout: Duration::from_mins(10),
        }
    }

    /// From `REELFORGE_HOST` / `REELFORGE_HOST_TOKEN`.
    #[must_use]
    pub fn from_env() -> Self {
        let url = std::env::var("REELFORGE_HOST").unwrap_or_else(|_| DEFAULT_HOST.into());
        let token = std::env::var("REELFORGE_HOST_TOKEN").ok();
        Self::from_url(&url, token)
    }

    /// `GET /health`.
    ///
    /// # Errors
    ///
    /// Transport or non-200.
    pub fn health(&self) -> Result<Health> {
        let (status, body) = self.exchange("GET", "/health", None)?;
        if status != 200 {
            return Err(ClientError::message(format!(
                "health HTTP {status}: {body}"
            )));
        }
        serde_json::from_str(&body).map_err(|e| ClientError::message(e.to_string()))
    }

    /// JSON-RPC `initialize`.
    ///
    /// # Errors
    ///
    /// Transport or RPC.
    pub fn initialize(&self) -> Result<Value> {
        self.rpc("initialize", &json!({}))
    }

    /// JSON-RPC `tools/list` names.
    ///
    /// # Errors
    ///
    /// Transport or RPC.
    pub fn tools(&self) -> Result<Vec<String>> {
        let v = self.rpc("tools/list", &json!({}))?;
        Ok(v.get("tools")
            .and_then(Value::as_array)
            .map(|arr| {
                arr.iter()
                    .filter_map(|t| t.get("name").and_then(Value::as_str).map(str::to_owned))
                    .collect()
            })
            .unwrap_or_default())
    }

    /// `tools/call` with structured result when present.
    ///
    /// # Errors
    ///
    /// Transport or RPC.
    pub fn call(&self, name: &str, arguments: &Value) -> Result<Value> {
        let v = self.rpc(
            "tools/call",
            &json!({ "name": name, "arguments": arguments }),
        )?;
        if let Some(sc) = v.get("structuredContent") {
            return Ok(sc.clone());
        }
        Ok(v)
    }

    /// Killer path.
    ///
    /// # Errors
    ///
    /// Transport or RPC.
    pub fn privacy_except(&self, req: &PrivacyExceptRequest) -> Result<Value> {
        self.call(
            "privacy_except",
            &serde_json::to_value(req).unwrap_or(Value::Null),
        )
    }

    fn rpc(&self, method: &str, params: &Value) -> Result<Value> {
        let payload = json!({
            "jsonrpc": "2.0",
            "id": 1,
            "method": method,
            "params": params,
        });
        let (status, body) = self.exchange("POST", "/mcp", Some(&payload.to_string()))?;
        if status == 401 {
            return Err(ClientError::message(
                "unauthorized (set REELFORGE_HOST_TOKEN)",
            ));
        }
        if status != 200 {
            return Err(ClientError::message(format!("http {status}: {body}")));
        }
        let v: Value =
            serde_json::from_str(&body).map_err(|e| ClientError::message(e.to_string()))?;
        if let Some(err) = v.get("error") {
            return Err(ClientError::Rpc {
                code: err.get("code").and_then(Value::as_i64).unwrap_or(-1),
                message: err
                    .get("message")
                    .and_then(Value::as_str)
                    .unwrap_or("rpc error")
                    .to_owned(),
            });
        }
        Ok(v.get("result").cloned().unwrap_or(Value::Null))
    }

    fn exchange(&self, method: &str, path: &str, body: Option<&str>) -> Result<(u16, String)> {
        let mut stream = TcpStream::connect(&self.host)
            .map_err(|e| ClientError::message(format!("connect {}: {e}", self.host)))?;
        stream
            .set_read_timeout(Some(self.timeout))
            .map_err(|e| ClientError::message(e.to_string()))?;
        stream
            .set_write_timeout(Some(self.timeout))
            .map_err(|e| ClientError::message(e.to_string()))?;
        let payload = body.unwrap_or("");
        let auth = self
            .token
            .as_deref()
            .map_or(String::new(), |t| format!("Authorization: Bearer {t}\r\n"));
        let req = format!(
            "{method} {path} HTTP/1.1\r\nHost: {}\r\nContent-Type: application/json\r\nContent-Length: {}\r\n{auth}Connection: close\r\n\r\n{payload}",
            self.host,
            payload.len()
        );
        stream
            .write_all(req.as_bytes())
            .map_err(|e| ClientError::message(e.to_string()))?;
        let _ = stream.shutdown(std::net::Shutdown::Write);
        let mut buf = Vec::new();
        stream
            .read_to_end(&mut buf)
            .map_err(|e| ClientError::message(e.to_string()))?;
        let text = String::from_utf8_lossy(&buf);
        let (head, rest) = text.split_once("\r\n\r\n").unwrap_or((&text, ""));
        let status = head
            .lines()
            .next()
            .and_then(|l| l.split_whitespace().nth(1))
            .and_then(|s| s.parse().ok())
            .unwrap_or(0);
        Ok((status, rest.to_owned()))
    }
}

/// `GET /health` body.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Health {
    /// Process is up.
    pub ok: bool,
    /// Server name.
    #[serde(default)]
    pub name: String,
    /// MCP protocol version.
    #[serde(default, rename = "protocolVersion")]
    pub protocol_version: String,
}

/// Args for Host `privacy_except`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrivacyExceptRequest {
    /// Input video, Capture session, or project.
    pub video: String,
    /// Reference photo.
    pub photo: String,
    /// Output mp4.
    pub output: String,
    /// Scratch dir.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub work_dir: Option<String>,
    /// `pixelate` / `gaussian` / `solid`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub style: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::{Read, Write};
    use std::net::TcpListener;
    use std::thread;

    fn spawn_ok() -> (String, thread::JoinHandle<()>) {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let addr = listener.local_addr().unwrap();
        let handle = thread::spawn(move || {
            for stream in listener.incoming().take(8) {
                let mut s = stream.unwrap();
                let mut buf = [0_u8; 4096];
                let n = s.read(&mut buf).unwrap_or(0);
                let req = String::from_utf8_lossy(&buf[..n]);
                let body = if req.starts_with("GET /health") {
                    r#"{"ok":true,"name":"reelforge-host","protocolVersion":"2024-11-05"}"#
                } else if req.contains("tools/list") {
                    r#"{"jsonrpc":"2.0","id":1,"result":{"tools":[{"name":"privacy_except"}]}}"#
                } else if req.contains("privacy_except") {
                    r#"{"jsonrpc":"2.0","id":1,"result":{"structuredContent":{"subject_id":1,"audio":"none"}}}"#
                } else {
                    r#"{"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2024-11-05"}}"#
                };
                let resp = format!(
                    "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
                    body.len()
                );
                let _ = s.write_all(resp.as_bytes());
            }
        });
        (addr.to_string(), handle)
    }

    #[test]
    fn health_and_privacy_except() {
        let (host, _h) = spawn_ok();
        let c = HostClient {
            host,
            token: None,
            timeout: Duration::from_secs(2),
        };
        let health = c.health().unwrap();
        assert!(health.ok);
        assert!(c.tools().unwrap().contains(&"privacy_except".into()));
        let out = c
            .privacy_except(&PrivacyExceptRequest {
                video: "a.mp4".into(),
                photo: "b.jpg".into(),
                output: "c.mp4".into(),
                work_dir: None,
                style: Some("pixelate".into()),
            })
            .unwrap();
        assert_eq!(out["subject_id"], 1);
    }
}
