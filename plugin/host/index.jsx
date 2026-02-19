/**
 * FXbuddy - ExtendScript Host Bridge
 * 
 * This file runs inside Adobe Premiere Pro / After Effects as ExtendScript.
 * It provides functions that the CEP panel (React UI) can call via CSInterface.evalScript().
 * 
 * ExtendScript is ES3 (no let/const, no arrow functions, no template literals).
 */

// ─── JSON Polyfill for ExtendScript (ES3) ─────────────────────────────────
// Minimal, ExtendScript-safe implementation. No unicode regex ranges that
// can break older ExtendScript engines.
if (typeof JSON === 'undefined') {
  JSON = {};
}
if (typeof JSON.stringify !== 'function') {
  JSON.stringify = function (val) {
    if (val === null || typeof val === 'undefined') return 'null';
    if (typeof val === 'boolean' || typeof val === 'number') return String(val);
    if (typeof val === 'string') {
      return '"' + val.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
                      .replace(/\n/g, '\\n').replace(/\r/g, '\\r')
                      .replace(/\t/g, '\\t') + '"';
    }
    if (typeof val === 'object') {
      if (val instanceof Array || (typeof val.length === 'number' && typeof val.splice === 'function')) {
        var arrParts = [];
        for (var i = 0; i < val.length; i++) {
          arrParts.push(JSON.stringify(val[i]));
        }
        return '[' + arrParts.join(',') + ']';
      }
      var objParts = [];
      for (var k in val) {
        if (val.hasOwnProperty(k)) {
          objParts.push('"' + k.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '":' + JSON.stringify(val[k]));
        }
      }
      return '{' + objParts.join(',') + '}';
    }
    return 'null';
  };
}
if (typeof JSON.parse !== 'function') {
  JSON.parse = function (text) {
    return eval('(' + text + ')');
  };
}

/**
 * Detect which Adobe host app we are running in.
 * Uses multiple detection methods since `app` may not always be available.
 * Returns 'PPRO', 'AEFT', or 'UNKNOWN'.
 */
function detectHostApp() {
  // Method 1: BridgeTalk.appName (most reliable in CEP context)
  try {
    if (typeof BridgeTalk !== 'undefined' && BridgeTalk.appName) {
      var btName = String(BridgeTalk.appName).toLowerCase();
      if (btName.indexOf('premiere') !== -1 || btName === 'premierepro') return 'PPRO';
      if (btName.indexOf('aftereffects') !== -1) return 'AEFT';
    }
  } catch(e) {}

  // Method 2: app.name
  try {
    if (typeof app !== 'undefined' && app.name) {
      var name = String(app.name).toLowerCase();
      if (name.indexOf('premiere') !== -1) return 'PPRO';
      if (name.indexOf('after effect') !== -1) return 'AEFT';
    }
  } catch(e) {}

  // Method 3: Check for Premiere-specific globals (QE DOM)
  try {
    if (typeof qe !== 'undefined') return 'PPRO';
  } catch(e) {}

  // Method 4: $.appName (ExtendScript global)
  try {
    if (typeof $ !== 'undefined' && $.appName) {
      var dollarName = String($.appName).toLowerCase();
      if (dollarName.indexOf('premiere') !== -1) return 'PPRO';
      if (dollarName.indexOf('aftereffect') !== -1) return 'AEFT';
    }
  } catch(e) {}

  return 'UNKNOWN';
}

/**
 * Diagnostic function -- call from the panel to check the environment.
 * Returns a JSON string with all the detection info we can gather.
 */
function getHostInfo() {
  var info = { detected: 'UNKNOWN' };
  try { info.appDefined = (typeof app !== 'undefined'); } catch(e) { info.appDefined = false; }
  try { info.appName = (typeof app !== 'undefined') ? String(app.name) : 'N/A'; } catch(e) { info.appName = 'error: ' + e.toString(); }
  try { info.btAppName = (typeof BridgeTalk !== 'undefined') ? String(BridgeTalk.appName) : 'N/A'; } catch(e) { info.btAppName = 'error'; }
  try { info.dollarAppName = (typeof $ !== 'undefined' && $.appName) ? String($.appName) : 'N/A'; } catch(e) { info.dollarAppName = 'error'; }
  try { info.qeDefined = (typeof qe !== 'undefined'); } catch(e) { info.qeDefined = false; }
  info.detected = detectHostApp();
  return JSON.stringify(info);
}

/**
 * Get information about the currently selected clip in the timeline.
 * Returns a JSON string with clip details.
 * 
 * Called from React via: csInterface.evalScript('getSelectedClip()', callback)
 */
function getSelectedClip() {
  try {
    var hostApp = detectHostApp();

    // --- PREMIERE PRO (or unknown -- try Premiere APIs first) ---
    if (hostApp === 'PPRO' || hostApp === 'UNKNOWN') {
      try {
        var project = app.project;
        if (project) {
          var seq = project.activeSequence;
          if (!seq) return JSON.stringify({ error: 'No active sequence' });

          // Look for selected clips in video tracks
          for (var t = 0; t < seq.videoTracks.numTracks; t++) {
            var track = seq.videoTracks[t];
            for (var c = 0; c < track.clips.numItems; c++) {
              var clip = track.clips[c];
              if (clip.isSelected()) {
                var playhead = seq.getPlayerPosition();
                var playheadSec = playhead ? playhead.seconds : clip.inPoint.seconds;
                var result = {
                  name: clip.name,
                  duration: clip.duration.seconds,
                  inPoint: clip.inPoint.seconds,
                  outPoint: clip.outPoint.seconds,
                  startTime: clip.start.seconds,
                  endTime: clip.end.seconds,
                  playheadTime: playheadSec,
                  trackIndex: t,
                  clipIndex: c,
                  mediaPath: clip.projectItem ? clip.projectItem.getMediaPath() : '',
                  app: 'PPRO'
                };
                return JSON.stringify(result);
              }
            }
          }

          return JSON.stringify({ error: 'No clip selected. Please select a clip in the timeline.' });
        }
      } catch (premiereErr) {
        // If hostApp was explicitly PPRO, report the error
        if (hostApp === 'PPRO') {
          return JSON.stringify({ error: 'Premiere Pro error: ' + premiereErr.toString() });
        }
        // Otherwise fall through to try After Effects
      }
    }

    // --- AFTER EFFECTS ---
    if (hostApp === 'AEFT' || hostApp === 'UNKNOWN') {
      try {
        var comp = app.project.activeItem;
        if (!comp) {
          return JSON.stringify({ error: 'No composition is open. Please open a composition first.' });
        }
        if (!(comp instanceof CompItem)) {
          return JSON.stringify({ error: 'Please select a composition (not a footage item) in the project panel.' });
        }
        var selectedLayers = comp.selectedLayers;
        if (!selectedLayers || selectedLayers.length === 0) {
          return JSON.stringify({ error: 'No layer selected. Please select a layer in the timeline.' });
        }

        var layer = selectedLayers[0];
        var source = layer.source;
        var aeResult = {
          name: layer.name,
          duration: layer.outPoint - layer.inPoint,
          inPoint: layer.inPoint,
          outPoint: layer.outPoint,
          startTime: layer.startTime,
          endTime: layer.outPoint,
          playheadTime: comp.time,
          layerIndex: layer.index,
          mediaPath: (source instanceof FootageItem && source.file) ? source.file.fsName : '',
          app: 'AEFT'
        };
        return JSON.stringify(aeResult);
      } catch (aeErr) {
        if (hostApp === 'AEFT') {
          return JSON.stringify({ error: 'After Effects error: ' + aeErr.toString() });
        }
      }
    }

    // If we get here, neither Premiere nor AE APIs worked. Return diagnostic info.
    return JSON.stringify({ error: 'Could not access host application. Host info: ' + getHostInfo() });
  } catch (e) {
    return JSON.stringify({ error: 'ExtendScript error: ' + e.toString() });
  }
}


/**
 * Export the selected clip to a temporary MP4 file.
 * Takes a JSON string with clip info (from getSelectedClip).
 * Returns the path to the exported temp file.
 * 
 * Called from React via: csInterface.evalScript('exportClipToTemp("' + escapedJSON + '")', callback)
 */
function exportClipToTemp(clipInfoJSON) {
  try {
    var clipInfo = JSON.parse(clipInfoJSON);

    if (clipInfo.app === 'PPRO') {
      // For Premiere Pro: Use the media path directly if available
      // (the actual clip file on disk - simpler than re-encoding for prototype)
      if (clipInfo.mediaPath && clipInfo.mediaPath.length > 0) {
        // Verify file exists
        var mediaFile = new File(clipInfo.mediaPath);
        if (mediaFile.exists) {
          return JSON.stringify({ path: clipInfo.mediaPath, method: 'direct' });
        }
      }

      // Fallback: Export via Adobe Media Encoder
      // For prototype, we use the direct media path approach above
      return JSON.stringify({ error: 'Could not access media file. Media path: ' + clipInfo.mediaPath });
    }

    if (clipInfo.app === 'AEFT') {
      // For After Effects: Use the source footage file directly
      if (clipInfo.mediaPath && clipInfo.mediaPath.length > 0) {
        var mediaFile = new File(clipInfo.mediaPath);
        if (mediaFile.exists) {
          return JSON.stringify({ path: clipInfo.mediaPath, method: 'direct' });
        }
      }

      return JSON.stringify({ error: 'Could not access media file. Media path: ' + clipInfo.mediaPath });
    }

    return JSON.stringify({ error: 'Unknown application: ' + clipInfo.app });
  } catch (e) {
    return JSON.stringify({ error: 'Export error: ' + e.toString() });
  }
}


/**
 * Import a generated video file into the project and place it on the timeline.
 * Takes the output file path and original clip info as JSON.
 * 
 * Called from React via: csInterface.evalScript('importAndReplaceClip("path", "clipJSON")', callback)
 */
function importAndReplaceClip(outputPath, clipInfoJSON) {
  try {
    var clipInfo = JSON.parse(clipInfoJSON);
    var outputFile = new File(outputPath);

    if (!outputFile.exists) {
      return JSON.stringify({ error: 'Output file not found: ' + outputPath });
    }

    if (clipInfo.app === 'PPRO') {
      var project = app.project;
      var seq = project.activeSequence;
      if (!seq) return JSON.stringify({ error: 'No active sequence' });

      // Import the generated video into the project
      var success = project.importFiles(
        [outputPath],
        true,  // suppress UI
        project.rootItem,
        false  // import as numbered stills
      );

      if (!success) {
        return JSON.stringify({ error: 'Failed to import file into project' });
      }

      // Find the newly imported item (last item in root bin)
      var rootItem = project.rootItem;
      var importedItem = rootItem.children[rootItem.children.numItems - 1];

      if (importedItem) {
        // Insert on a track above the original clip
        var targetTrack = Math.min(clipInfo.trackIndex + 1, seq.videoTracks.numTracks - 1);
        var insertTime = clipInfo.startTime;

        seq.videoTracks[targetTrack].insertClip(importedItem, insertTime);

        // --- Remove auto-placed audio ---
        // insertClip() automatically places audio on a corresponding audio track;
        // generated AI video has no useful audio so we remove it.
        for (var at = 0; at < seq.audioTracks.numTracks; at++) {
          var aTrack = seq.audioTracks[at];
          for (var ac = aTrack.clips.numItems - 1; ac >= 0; ac--) {
            var aClip = aTrack.clips[ac];
            if (aClip.name === importedItem.name &&
                Math.abs(aClip.start.seconds - insertTime) < 0.1) {
              aClip.remove(false, false);
            }
          }
        }

        // --- Scale video to match sequence frame size ---
        var seqWidth = parseInt(seq.frameSizeHorizontal, 10);
        var seqHeight = parseInt(seq.frameSizeVertical, 10);

        // Try to read source video dimensions
        var clipW = 0;
        var clipH = 0;

        // Method 1: Project metadata (Premiere-generated column data)
        try {
          var projMeta = importedItem.getProjectMetadata();
          if (projMeta) {
            var vidInfo = projMeta.match(/VideoInfo[^>]*>(\d+)\s*x\s*(\d+)/);
            if (vidInfo) {
              clipW = parseInt(vidInfo[1], 10);
              clipH = parseInt(vidInfo[2], 10);
            }
          }
        } catch (metaErr) {}

        // Method 2: XMP metadata embedded in the media file
        if (clipW === 0) {
          try {
            var xmpData = importedItem.getXMPMetadata();
            if (xmpData) {
              var wm = xmpData.match(/stDim:w="(\d+)"/);
              var hm = xmpData.match(/stDim:h="(\d+)"/);
              if (wm && hm) {
                clipW = parseInt(wm[1], 10);
                clipH = parseInt(hm[1], 10);
              }
            }
          } catch (xmpErr) {}
        }

        // Apply scale if source differs from sequence
        if (clipW > 0 && clipH > 0 && (clipW !== seqWidth || clipH !== seqHeight)) {
          var scaleX = (seqWidth / clipW) * 100;
          var scaleY = (seqHeight / clipH) * 100;
          var newScale = Math.max(scaleX, scaleY); // cover-fill so no black bars

          // Find the newly inserted clip on the video track
          var newClip = null;
          var vTrack = seq.videoTracks[targetTrack];
          for (var vc = vTrack.clips.numItems - 1; vc >= 0; vc--) {
            var vClip = vTrack.clips[vc];
            if (vClip.name === importedItem.name &&
                Math.abs(vClip.start.seconds - insertTime) < 0.1) {
              newClip = vClip;
              break;
            }
          }

          if (newClip) {
            // Navigate to Motion > Scale and set the value
            var components = newClip.components;
            for (var ci = 0; ci < components.numItems; ci++) {
              if (components[ci].displayName === "Motion") {
                var props = components[ci].properties;
                for (var pi = 0; pi < props.numItems; pi++) {
                  if (props[pi].displayName === "Scale") {
                    props[pi].setValue(newScale, true);
                    break;
                  }
                }
                break;
              }
            }
          }
        }

        return JSON.stringify({
          success: true,
          importedName: importedItem.name,
          trackIndex: targetTrack,
          insertTime: insertTime
        });
      }

      return JSON.stringify({ error: 'Could not find imported item in project' });
    }

    if (clipInfo.app === 'AEFT') {
      var project = app.project;
      var comp = project.activeItem;
      if (!comp || !(comp instanceof CompItem)) {
        return JSON.stringify({ error: 'No active composition' });
      }

      // Import the file
      var importOptions = new ImportOptions(outputFile);
      var importedItem = project.importFile(importOptions);

      if (!importedItem) {
        return JSON.stringify({ error: 'Failed to import file' });
      }

      // Add to comp as a new layer (above selected layer)
      var newLayer = comp.layers.add(importedItem);
      newLayer.startTime = clipInfo.inPoint;

      // Move above the original layer
      if (clipInfo.layerIndex) {
        newLayer.moveAfter(comp.layers[clipInfo.layerIndex]);
      }

      return JSON.stringify({
        success: true,
        importedName: importedItem.name,
        layerIndex: newLayer.index
      });
    }

    return JSON.stringify({ error: 'Unknown application' });
  } catch (e) {
    return JSON.stringify({ error: 'Import error: ' + e.toString() });
  }
}

/**
 * Import a motion graphic (no source clip) and place it at the current playhead position.
 * For Premiere Pro: imports the file, inserts on the topmost video track at playhead.
 * For After Effects: imports the file, adds as a new layer in the active composition.
 */
function importMotionGraphic(outputPath) {
  try {
    var outputFile = new File(outputPath);
    if (!outputFile.exists) {
      return JSON.stringify({ error: 'Output file not found: ' + outputPath });
    }

    var hostApp = detectHostApp();

    if (hostApp === 'PPRO' || hostApp === 'UNKNOWN') {
      try {
        var project = app.project;
        var seq = project.activeSequence;
        if (!seq) return JSON.stringify({ error: 'No active sequence. Open a sequence first.' });

        // Import the motion graphic into the project
        var success = project.importFiles(
          [outputPath],
          true,  // suppress UI
          project.rootItem,
          false
        );

        if (!success) {
          return JSON.stringify({ error: 'Failed to import file into project' });
        }

        // Find the newly imported item (last item in root bin)
        var rootItem = project.rootItem;
        var importedItem = rootItem.children[rootItem.children.numItems - 1];

        if (!importedItem) {
          return JSON.stringify({ error: 'Could not find imported item' });
        }

        // Get the playhead position
        var playheadTime = seq.getPlayerPosition();

        // Find the highest non-empty video track, or use track 0
        var targetTrack = 0;
        for (var t = seq.videoTracks.numTracks - 1; t >= 0; t--) {
          if (seq.videoTracks[t].clips.numItems > 0) {
            targetTrack = Math.min(t + 1, seq.videoTracks.numTracks - 1);
            break;
          }
        }

        // Insert at playhead on the target track
        seq.videoTracks[targetTrack].insertClip(importedItem, playheadTime);

        // Remove auto-placed audio (motion graphics have no audio)
        for (var at = 0; at < seq.audioTracks.numTracks; at++) {
          var aTrack = seq.audioTracks[at];
          for (var ac = aTrack.clips.numItems - 1; ac >= 0; ac--) {
            var aClip = aTrack.clips[ac];
            if (aClip.name === importedItem.name &&
                Math.abs(aClip.start.seconds - playheadTime.seconds) < 0.1) {
              aClip.remove(false, false);
            }
          }
        }

        return JSON.stringify({
          success: true,
          app: 'PPRO',
          name: importedItem.name,
          trackIndex: targetTrack,
          startTime: playheadTime.seconds
        });

      } catch (pproErr) {
        if (hostApp === 'PPRO') {
          return JSON.stringify({ error: 'Premiere import error: ' + pproErr.toString() });
        }
      }
    }

    if (hostApp === 'AEFT' || hostApp === 'UNKNOWN') {
      try {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
          return JSON.stringify({ error: 'No active composition. Open a composition first.' });
        }

        var importedFile = app.project.importFile(new ImportOptions(outputFile));
        var newLayer = comp.layers.add(importedFile);

        // Move layer to playhead position
        newLayer.startTime = comp.time;

        return JSON.stringify({
          success: true,
          app: 'AEFT',
          name: importedFile.name,
          layerIndex: newLayer.index
        });
      } catch (aeErr) {
        return JSON.stringify({ error: 'After Effects import error: ' + aeErr.toString() });
      }
    }

    return JSON.stringify({ error: 'Unknown application' });
  } catch (e) {
    return JSON.stringify({ error: 'Motion import error: ' + e.toString() });
  }
}
