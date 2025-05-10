fn main() -> Result<(), Box<dyn std::error::Error>> {
    tonic_build::configure()
        .type_attribute(".", "#[derive(serde::Serialize, serde::Deserialize)]")
        .build_server(true)
        .build_client(false) // We are building the server in this crate
        .compile(
            &["proto/unitodo.proto"], // Path to your .proto file
            &["proto"],               // Include path for imports in .proto files
        )?;
    tauri_build::build();
    Ok(())
}
