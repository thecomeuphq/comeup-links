// Shared storage contract used by the new The Come Up pages.
// Inlined into each page so every page stays a single self-contained file.
module.exports = {
  PROFILE_KEY: "comeup.profile.v1",
  FAVS_KEY: "comeup.favs.v1",
  RITUAL_KEY: "comeup.ritual.v1",
  SNIPPET: "\n    // --- shared progress store (comeup.profile.v1) ---\n    var PROFILE_KEY = \"comeup.profile.v1\";\n    var FAVS_KEY = \"comeup.favs.v1\";\n    var RITUAL_KEY = \"comeup.ritual.v1\";\n\n    function getJSON(key, fallback) {\n      try {\n        var raw = localStorage.getItem(key);\n        return raw ? JSON.parse(raw) : fallback;\n      } catch (e) { return fallback; }\n    }\n    function setJSON(key, value) {\n      try { localStorage.setItem(key, JSON.stringify(value)); return true; }\n      catch (e) { return false; }\n    }\n    function getProfile() {\n      var p = getJSON(PROFILE_KEY, {});\n      return (p && typeof p === 'object') ? p : {};\n    }\n    function saveProfile(patch) {\n      var p = getProfile();\n      for (var k in patch) { if (Object.prototype.hasOwnProperty.call(patch, k)) p[k] = patch[k]; }\n      setJSON(PROFILE_KEY, p);\n      return p;\n    }\n    function getFavs() {\n      var f = getJSON(FAVS_KEY, []);\n      return Array.isArray(f) ? f : [];\n    }\n    function saveFavs(list) { setJSON(FAVS_KEY, list); }\n"
};
