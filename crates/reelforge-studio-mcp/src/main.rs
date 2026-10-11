//! Forward the actual Host catalog through mcport; no independent tool schemas.

#![allow(clippy::doc_markdown, clippy::needless_pass_by_value)]

use mcport::{McpServer, ToolReply, json};
use reelforge_studio_client::HostClient;

fn main() -> std::io::Result<()> {
    let client = HostClient::from_env();
    let health = client.clone();
    let catalog = client.clone();
    let mut server=McpServer::new("reelforge-studio",env!("CARGO_PKG_VERSION"))
        .instructions("Forwarding surface for ReelForge-Host. Host owns production, revisions and tool schemas. Set REELFORGE_HOST; reconnect after a Host catalog update.")
        .tool("host_health","Ping Host GET /health",json!({"type":"object"}),move |_|match health.health() {Ok(value)=>ToolReply::structured(value),Err(e)=>ToolReply::error(e.to_string())})
        .tool("host_tools","Inspect the current Host catalog",json!({"type":"object"}),move |_|match catalog.tool_catalog() {Ok(value)=>ToolReply::structured(value),Err(e)=>ToolReply::error(e.to_string())});
    match client.tool_catalog() {
        Ok(tools) => {
            for definition in tools {
                let name = definition["name"]
                    .as_str()
                    .ok_or_else(|| std::io::Error::other("Host tool name missing"))?
                    .to_owned();
                let description = definition["description"]
                    .as_str()
                    .unwrap_or("Host tool")
                    .to_owned();
                let schema = json!(definition["inputSchema"]);
                let remote = client.clone();
                let method = name.clone();
                server = server.tool(name, description, schema, move |arguments| {
                    let args = match serde_json::from_str(&arguments.to_string()) {
                        Ok(value) => value,
                        Err(e) => return ToolReply::error(e.to_string()),
                    };
                    match remote.call(&method, &args) {
                        Ok(value) => ToolReply::structured(value),
                        Err(e) => ToolReply::error(e.to_string()),
                    }
                });
            }
        }
        Err(error) => eprintln!("Host catalog unavailable; host_health remains available: {error}"),
    }
    server.serve()
}
