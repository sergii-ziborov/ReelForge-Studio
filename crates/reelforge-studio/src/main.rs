//! Native desktop: egui, no Electron, talks to Host HTTP.

#![allow(clippy::doc_markdown, clippy::assigning_clones)]

use eframe::egui;
use reelforge_studio_client::{HostClient, PrivacyExceptRequest};

fn main() -> eframe::Result<()> {
    let options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default()
            .with_inner_size([720.0, 520.0])
            .with_title("ReelForge Studio"),
        ..Default::default()
    };
    eframe::run_native(
        "ReelForge Studio",
        options,
        Box::new(|_cc| Ok(Box::new(StudioApp::default()))),
    )
}

struct StudioApp {
    host: String,
    token: String,
    video: String,
    photo: String,
    output: String,
    style: String,
    log: String,
    last_ok: Option<bool>,
}

impl Default for StudioApp {
    fn default() -> Self {
        let env = HostClient::from_env();
        Self {
            host: format!("http://{}", env.host),
            token: env.token.unwrap_or_default(),
            video: String::new(),
            photo: String::new(),
            output: "out.mp4".into(),
            style: "pixelate".into(),
            log: "Host must already be running: reelforge-host serve --http\n".into(),
            last_ok: None,
        }
    }
}

impl StudioApp {
    fn client(&self) -> HostClient {
        let token = if self.token.trim().is_empty() {
            None
        } else {
            Some(self.token.clone())
        };
        HostClient::from_url(&self.host, token)
    }

    fn ping(&mut self) {
        match self.client().health() {
            Ok(h) => {
                self.last_ok = Some(h.ok);
                self.log = format!("health ok={} name={} proto={}\n", h.ok, h.name, h.protocol_version);
            }
            Err(e) => {
                self.last_ok = Some(false);
                self.log = format!("health failed: {e}\n");
            }
        }
    }

    fn run_except(&mut self) {
        let req = PrivacyExceptRequest {
            video: self.video.trim().to_owned(),
            photo: self.photo.trim().to_owned(),
            output: self.output.trim().to_owned(),
            work_dir: Some("work".into()),
            style: Some(self.style.trim().to_owned()),
        };
        if req.video.is_empty() || req.photo.is_empty() {
            self.log = "video and photo paths required (files on the Host machine)\n".into();
            self.last_ok = Some(false);
            return;
        }
        self.log = "running privacy_except…\n".into();
        match self.client().privacy_except(&req) {
            Ok(v) => {
                self.last_ok = Some(true);
                self.log = serde_json::to_string_pretty(&v).unwrap_or_else(|_| v.to_string());
            }
            Err(e) => {
                self.last_ok = Some(false);
                self.log = format!("{e}\n");
            }
        }
    }
}

impl eframe::App for StudioApp {
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        egui::CentralPanel::default().show(ctx, |ui| {
            ui.heading("ReelForge Studio");
            ui.label("egui desktop · no Electron · Host HTTP MCP");
            ui.separator();
            ui.horizontal(|ui| {
                ui.label("Host");
                ui.text_edit_singleline(&mut self.host);
            });
            ui.horizontal(|ui| {
                ui.label("Token");
                ui.add(egui::TextEdit::singleline(&mut self.token).password(true));
            });
            ui.horizontal(|ui| {
                ui.label("Video");
                ui.text_edit_singleline(&mut self.video);
            });
            ui.horizontal(|ui| {
                ui.label("Photo");
                ui.text_edit_singleline(&mut self.photo);
            });
            ui.horizontal(|ui| {
                ui.label("Output");
                ui.text_edit_singleline(&mut self.output);
            });
            ui.horizontal(|ui| {
                ui.label("Style");
                ui.text_edit_singleline(&mut self.style);
            });
            ui.horizontal(|ui| {
                if ui.button("Ping Host").clicked() {
                    self.ping();
                }
                if ui.button("Privacy except").clicked() {
                    self.run_except();
                }
                if let Some(ok) = self.last_ok {
                    ui.colored_label(
                        if ok {
                            egui::Color32::from_rgb(80, 180, 80)
                        } else {
                            egui::Color32::from_rgb(200, 80, 80)
                        },
                        if ok { "ok" } else { "error" },
                    );
                }
            });
            ui.separator();
            egui::ScrollArea::vertical().show(ui, |ui| {
                ui.monospace(&self.log);
            });
        });
    }
}
