//! Agent-facing MCP (mcport, no Tokio) → Host HTTP.

#![allow(clippy::doc_markdown, clippy::needless_pass_by_value)]

use mcport::{McpServer, ToolReply, json};
use reelforge_studio_client::{HostClient, PrivacyExceptRequest};

fn main() -> std::io::Result<()> {
    let client = HostClient::from_env();
    let health_client = client.clone();
    let tools_client = client.clone();
    let except_client = client;
    let mut server = McpServer::new("reelforge-studio", env!("CARGO_PKG_VERSION"))
        .instructions("Proxy for ReelForge-Host HTTP MCP. Set REELFORGE_HOST.")
        .tool(
            "host_health",
            "Ping Host GET /health",
            json!({ "type": "object" }),
            move |_| match health_client.health() {
                Ok(h) => ToolReply::structured(h),
                Err(e) => ToolReply::error(e.to_string()),
            },
        )
        .tool(
            "host_tools",
            "List Host MCP tools",
            json!({ "type": "object" }),
            move |_| match tools_client.tools() {
                Ok(t) => ToolReply::structured(t),
                Err(e) => ToolReply::error(e.to_string()),
            },
        )
        .typed_tool::<PrivacyExceptRequest>(
            "privacy_except",
            "Blur everyone except the accepted photo subject",
            json!({
                "type": "object",
                "required": ["video", "photo", "output"],
                "properties": {
                    "video": { "type": "string" },
                    "photo": { "type": "string" },
                    "output": { "type": "string" },
                    "work_dir": { "type": "string" },
                    "style": { "type": "string" }
                }
            }),
            move |req: PrivacyExceptRequest| {
                if req.video.is_empty() || req.photo.is_empty() || req.output.is_empty() {
                    return ToolReply::error("video, photo, output required");
                }
                match except_client.privacy_except(&req) {
                    Ok(v) => ToolReply::structured(v),
                    Err(e) => ToolReply::error(e.to_string()),
                }
            },
        );
    server.serve()
}
