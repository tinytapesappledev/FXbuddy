import { ClipInfo, useAdobeStore } from '../stores/useAdobeStore';

/**
 * Adobe CEP Bridge Service
 * 
 * Wraps CSInterface.evalScript() calls with proper error handling.
 * Provides graceful fallbacks when running outside Adobe (browser testing).
 */

declare global {
  interface Window {
    CSInterface: any;
    cep_node: any;
    require: any;
  }
}

let csInterface: any = null;

/** API base URL for the backend server */
const API_BASE = (window as any).__FXBUDDY_API_BASE__ || 'http://localhost:4000';

/**
 * Register keyboard shortcuts so copy/paste/select-all/undo
 * work in text inputs instead of being consumed by the host app.
 *
 * CEP panels run inside Chromium Embedded Framework (CEF), but the
 * Adobe host intercepts Cmd/Ctrl shortcuts before they reach CEF.
 * registerKeyEventsInterest() tells the host to let them through.
 */
function registerKeyboardShortcuts(cs: any): void {
  try {
    const keyEvents = [
      { keyCode: 65, ctrlKey: true },  // Ctrl/Cmd+A  (Select All)
      { keyCode: 67, ctrlKey: true },  // Ctrl/Cmd+C  (Copy)
      { keyCode: 86, ctrlKey: true },  // Ctrl/Cmd+V  (Paste)
      { keyCode: 88, ctrlKey: true },  // Ctrl/Cmd+X  (Cut)
      { keyCode: 90, ctrlKey: true },  // Ctrl/Cmd+Z  (Undo)
    ];
    cs.registerKeyEventsInterest(JSON.stringify(keyEvents));
    console.log('[Adobe] Registered keyboard shortcuts for copy/paste');
  } catch (e) {
    console.warn('[Adobe] Failed to register key events interest:', e);
  }

  // Fallback: manually invoke clipboard commands via execCommand
  // in case the native browser handling doesn't fully kick in.
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    const isMod = e.metaKey || e.ctrlKey;
    if (!isMod) return;

    const el = document.activeElement;
    const isInput =
      el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
    const isEditable =
      isInput || (el instanceof HTMLElement && el.isContentEditable);
    if (!isEditable) return;

    switch (e.key.toLowerCase()) {
      case 'a':
        if (isInput) {
          (el as HTMLInputElement | HTMLTextAreaElement).select();
        } else {
          document.execCommand('selectAll');
        }
        e.preventDefault();
        return;
      case 'c':
        document.execCommand('copy');
        e.preventDefault();
        return;
      case 'v':
        document.execCommand('paste');
        e.preventDefault();
        return;
      case 'x':
        document.execCommand('cut');
        e.preventDefault();
        return;
      case 'z':
        document.execCommand(e.shiftKey ? 'redo' : 'undo');
        e.preventDefault();
        return;
      default:
        return;
    }
  });
}

/**
 * Initialize the Adobe bridge. 
 * Call this once on app startup.
 */
export function initAdobe(): boolean {
  try {
    if (window.CSInterface) {
      csInterface = new window.CSInterface();
      const hostEnv = csInterface.getHostEnvironment();
      const isAdobe = hostEnv && hostEnv.appName !== 'BROWSER';

      useAdobeStore.getState().setIsInsideAdobe(isAdobe);
      console.log(`[Adobe] Initialized. Running inside: ${isAdobe ? hostEnv.appName : 'Browser'}`);

      if (isAdobe) {
        // Enable copy/paste/undo keyboard shortcuts in the panel
        registerKeyboardShortcuts(csInterface);

        // Step 1: Check if ExtendScript engine works at all
        csInterface.evalScript('"fxbuddy_ping"', (result: string) => {
          console.log('[Adobe] ExtendScript ping result:', result);

          // Step 2: Check if our functions are loaded (ScriptPath)
          csInterface.evalScript('typeof getSelectedClip', (typeResult: string) => {
            console.log('[Adobe] getSelectedClip type:', typeResult);

            if (typeResult === 'function') {
              console.log('[Adobe] ExtendScript host file loaded successfully via ScriptPath');
              // Functions are available, try getting host info
              csInterface.evalScript('getHostInfo()', (info: string) => {
                console.log('[Adobe] ExtendScript host info:', info);
              });
            } else {
              // ScriptPath didn't load the file -- manually load it
              console.warn('[Adobe] ScriptPath did not load host/index.jsx. Loading manually...');
              const extPath = csInterface.getSystemPath('extension');
              const jsxPath = extPath + '/host/index.jsx';
              console.log('[Adobe] Attempting to load:', jsxPath);

              const loadScript = '$.evalFile("' + jsxPath.replace(/\\/g, '/') + '")';
              csInterface.evalScript(loadScript, (loadResult: string) => {
                console.log('[Adobe] Manual load result:', loadResult);
                // Verify it worked
                csInterface.evalScript('typeof getSelectedClip', (verifyResult: string) => {
                  console.log('[Adobe] After manual load, getSelectedClip type:', verifyResult);
                  if (verifyResult === 'function') {
                    console.log('[Adobe] Manual load succeeded!');
                  } else {
                    console.error('[Adobe] Manual load FAILED. ExtendScript functions not available.');
                  }
                });
              });
            }
          });
        });
      }

      return isAdobe;
    }
  } catch (e) {
    console.warn('[Adobe] CSInterface not available:', e);
  }

  useAdobeStore.getState().setIsInsideAdobe(false);
  return false;
}

/**
 * Attempt to (re)load the ExtendScript host file.
 * Returns true if loading succeeded.
 */
function reloadHostScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!csInterface) { resolve(false); return; }
    const extPath = csInterface.getSystemPath('extension');
    const jsxPath = extPath + '/host/index.jsx';
    console.log('[Adobe] Reloading host script from:', jsxPath);
    const loadScript = '$.evalFile("' + jsxPath.replace(/\\/g, '/') + '")';
    csInterface.evalScript(loadScript, () => {
      csInterface.evalScript('typeof getSelectedClip', (typeResult: string) => {
        const ok = typeResult === 'function';
        console.log('[Adobe] Host script reload ' + (ok ? 'succeeded' : 'FAILED'));
        resolve(ok);
      });
    });
  });
}

/**
 * Call an ExtendScript function and return the result.
 * If the first attempt returns "EvalScript error." (host script not loaded),
 * automatically reloads the host script and retries once.
 */
function evalScript(script: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!csInterface) {
      reject(new Error('CSInterface not initialized'));
      return;
    }

    csInterface.evalScript(script, (result: string) => {
      if (result === 'EvalScript error.' || result?.startsWith('EvalScript error:')) {
        console.warn('[Adobe] EvalScript error — attempting host script reload and retry...');
        reloadHostScript().then((ok) => {
          if (!ok) {
            reject(new Error('Host script not loaded. Try closing and reopening the FXbuddy panel.'));
            return;
          }
          csInterface.evalScript(script, (retryResult: string) => {
            if (retryResult === 'EvalScript error.' || retryResult?.startsWith('EvalScript error:')) {
              reject(new Error('Host script not loaded. Try closing and reopening the FXbuddy panel.'));
            } else {
              resolve(retryResult);
            }
          });
        });
      } else {
        resolve(result);
      }
    });
  });
}

/**
 * Get the currently selected clip from the Adobe timeline.
 * Returns ClipInfo or throws an error.
 */
export async function getSelectedClip(): Promise<ClipInfo> {
  const store = useAdobeStore.getState();

  if (!store.isInsideAdobe) {
    // Browser fallback: return mock clip data for testing
    console.log('[Adobe] Browser mode - returning mock clip');
    const mockClip: ClipInfo = {
      name: 'test_clip.mp4',
      duration: 5.0,
      inPoint: 0,
      outPoint: 5.0,
      startTime: 10.0,
      endTime: 15.0,
      mediaPath: '/tmp/fxbuddy/test_clip.mp4',
      app: 'BROWSER',
    };
    store.setSelectedClip(mockClip);
    return mockClip;
  }

  try {
    store.setExporting(false);
    const result = await evalScript('getSelectedClip()');
    const clipData = JSON.parse(result);

    if (clipData.error) {
      store.setClipError(clipData.error);
      throw new Error(clipData.error);
    }

    const clip: ClipInfo = clipData;
    store.setSelectedClip(clip);
    return clip;
  } catch (e: any) {
    store.setClipError(e.message);
    throw e;
  }
}

/**
 * Export the selected clip to a temporary file.
 * Returns the path to the exported file.
 */
export async function exportClipToTemp(clip: ClipInfo): Promise<string> {
  const store = useAdobeStore.getState();

  if (!store.isInsideAdobe) {
    // Browser fallback: no real file to export
    console.log('[Adobe] Browser mode - skipping export');
    return clip.mediaPath;
  }

  try {
    store.setExporting(true);
    const clipJSON = JSON.stringify(clip).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const result = await evalScript(`exportClipToTemp("${clipJSON}")`);
    const exportData = JSON.parse(result);

    store.setExporting(false);

    if (exportData.error) {
      throw new Error(exportData.error);
    }

    return exportData.path;
  } catch (e: any) {
    store.setExporting(false);
    throw e;
  }
}

/**
 * Resolve a Node.js built-in module from the CEP environment.
 * Tries cep_node.require first (CEP 9+), then window.require (--enable-nodejs).
 */
function cepRequire(moduleName: string): any {
  if (window.cep_node?.require) {
    try { return window.cep_node.require(moduleName); } catch (_) { /* fall through */ }
  }
  if (window.require) {
    try { return window.require(moduleName); } catch (_) { /* fall through */ }
  }
  return null;
}

/**
 * Download a file from a URL to a local temp path using Node.js (CEP environment).
 * Returns the local file path.
 */
async function downloadToLocal(url: string, jobId: string): Promise<string> {
  const os = cepRequire('os');
  const path = cepRequire('path');
  const fs = cepRequire('fs');
  const http = cepRequire('http');

  if (!os || !path || !fs || !http) {
    throw new Error(
      'Node.js modules (os, path, fs, http) not available. ' +
      'Make sure --enable-nodejs is set in the CEP manifest.'
    );
  }

  return new Promise<string>((resolve, reject) => {
    const tmpDir = path.join(os.tmpdir(), 'fxbuddy');
    try {
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
    } catch (mkdirErr: any) {
      reject(new Error('Failed to create temp directory ' + tmpDir + ': ' + mkdirErr.message));
      return;
    }

    const localPath = path.join(tmpDir, `${jobId}.mp4`);
    const file = fs.createWriteStream(localPath);

    console.log(`[Adobe] Downloading result to: ${localPath}`);

    const TIMEOUT_MS = 120000; // 2 minute timeout for download

    const request = http.get(url, (response: any) => {
      // Handle HTTP errors
      if (response.statusCode && response.statusCode >= 400) {
        file.close();
        fs.unlink(localPath, () => {});
        reject(new Error(`Download failed with HTTP ${response.statusCode}`));
        return;
      }

      // Handle redirects (301, 302, 307)
      if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307) {
        file.close();
        const redirectUrl = response.headers.location;
        if (!redirectUrl) {
          reject(new Error('Redirect with no Location header'));
          return;
        }
        console.log(`[Adobe] Following redirect to: ${redirectUrl}`);
        // Re-download from the redirect URL
        const redirectFile = fs.createWriteStream(localPath);
        http.get(redirectUrl, (redirected: any) => {
          redirected.pipe(redirectFile);
          redirectFile.on('finish', () => {
            redirectFile.close();
            console.log(`[Adobe] Download complete: ${localPath}`);
            resolve(localPath);
          });
        }).on('error', (err: any) => {
          redirectFile.close();
          fs.unlink(localPath, () => {});
          reject(new Error('Download redirect failed: ' + err.message));
        });
        return;
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`[Adobe] Download complete: ${localPath}`);
        resolve(localPath);
      });
      file.on('error', (err: any) => {
        file.close();
        fs.unlink(localPath, () => {});
        reject(new Error('File write error: ' + err.message));
      });
    });

    request.on('error', (err: any) => {
      file.close();
      fs.unlink(localPath, () => {});
      reject(new Error('Download request failed: ' + err.message));
    });

    request.setTimeout(TIMEOUT_MS, () => {
      request.destroy();
      file.close();
      fs.unlink(localPath, () => {});
      reject(new Error('Download timed out after ' + (TIMEOUT_MS / 1000) + ' seconds'));
    });
  });
}

/**
 * Import the generated video back into the Adobe timeline.
 * 
 * When running inside Adobe CEP:
 * 1. Downloads the video from the backend to a local temp file
 * 2. Passes the local file path to ExtendScript for timeline import
 * 
 * @param downloadUrl The backend URL to download the generated video from
 * @param clip The original clip info for placement
 */
export async function importResult(downloadUrl: string, clip: ClipInfo): Promise<void> {
  const store = useAdobeStore.getState();

  if (!store.isInsideAdobe) {
    console.log('[Adobe] Browser mode - skipping import. Video available at:', downloadUrl);
    return;
  }

  try {
    store.setImporting(true);

    // Extract jobId from the URL for naming the temp file
    const urlParts = downloadUrl.split('/');
    const jobId = urlParts[urlParts.length - 1] || 'output';

    // Step 1: Download the generated video to a local temp path
    console.log('[Adobe] Downloading generated video to local temp...');
    const localPath = await downloadToLocal(downloadUrl, jobId);

    // Step 2: Pass the LOCAL file path to ExtendScript for import
    const clipJSON = JSON.stringify(clip).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const escapedPath = localPath.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const result = await evalScript(`importAndReplaceClip("${escapedPath}", "${clipJSON}")`);
    const importData = JSON.parse(result);

    store.setImporting(false);

    if (importData.error) {
      throw new Error(importData.error);
    }

    console.log('[Adobe] Import successful:', importData);
  } catch (e: any) {
    store.setImporting(false);
    throw e;
  }
}

/**
 * Import a motion graphic result to the timeline at the playhead position.
 * Unlike importResult(), this does NOT require a source clip reference.
 */
export async function importMotionResult(downloadUrl: string): Promise<void> {
  const store = useAdobeStore.getState();

  if (!store.isInsideAdobe) {
    console.log('[Adobe] Browser mode - skipping import. Motion video available at:', downloadUrl);
    return;
  }

  try {
    store.setImporting(true);

    const urlParts = downloadUrl.split('/');
    const jobId = urlParts[urlParts.length - 1] || 'motion_output';

    console.log('[Adobe] Downloading motion graphic to local temp...');
    const localPath = await downloadToLocal(downloadUrl, jobId);

    const escapedPath = localPath.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const result = await evalScript(`importMotionGraphic("${escapedPath}")`);
    const importData = JSON.parse(result);

    store.setImporting(false);

    if (importData.error) {
      throw new Error(importData.error);
    }

    console.log('[Adobe] Motion graphic import successful:', importData);
  } catch (e: any) {
    store.setImporting(false);
    throw e;
  }
}

/**
 * Check if we're running inside Adobe CEP.
 */
export function isInsideAdobe(): boolean {
  return useAdobeStore.getState().isInsideAdobe;
}
