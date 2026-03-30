import { getSetting } from "../features/offline-mode/offlineDB";

/**
 * Saves a data object to the local Tabibi Data folder if configured.
 * @param {string} fileName - Name of the file (e.g. 'patients.json')
 * @param {any} data - Data to save
 */
export async function saveToLocalFolder(fileName, data) {
  try {
    const handle = await getSetting("tabibi_data_dir_handle");
    if (!handle) return false;

    // Verify permission
    const perm = await handle.queryPermission({ mode: "readwrite" });
    if (perm !== "granted") {
      // We can't request permission automatically from a background service call
      // as it requires a user gesture.
      return false;
    }

    const fileHandle = await handle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();
    return true;
  } catch (e) {
    console.error(`Failed to save to local folder (${fileName}):`, e);
    return false;
  }
}

/**
 * Loads data from the local Tabibi Data folder.
 */
export async function loadFromLocalFolder(fileName) {
  try {
    const handle = await getSetting("tabibi_data_dir_handle");
    if (!handle) return null;

    const perm = await handle.queryPermission({ mode: "read" });
    if (perm !== "granted") return null;

    const fileHandle = await handle.getFileHandle(fileName);
    const file = await fileHandle.getFile();
    const text = await file.text();
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}
