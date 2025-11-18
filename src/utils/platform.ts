import { invoke } from "@tauri-apps/api/core";

export async function getPlatform(): Promise<string> {
  const platform = await invoke("get_platform");
  return platform as string;
}
