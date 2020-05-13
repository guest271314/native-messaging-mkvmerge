# native-messaging-mkvmerge
Merge [Matroska](https://www.matroska.org/) and [WebM](https://www.webmproject.org/) files using [Native Messaging](https://developer.chrome.com/apps/nativeMessaging), [mkvmerge](https://mkvtoolnix.download/doc/mkvmerge.html), [JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

Tested at Chromium 77, which currently supports [Native File System](https://wicg.github.io/native-file-system) for writing files to local filesystem using JavaScript shipped with the browser. `mkvmerge` requires the complete file at local filesystem. `TODO:` Write version for Firefox.

# Install
- Download the repository. 
- Build or install [MKVToolNix](https://gitlab.com/mbunkus/mkvtoolnix) version 36.0.0.
- Save `mkvmerge` in `host` folder and set `cmd` as `"./mkvmerge"` or `"mkvmerge"` to execute the command installed by package manager. 
- Open `native_messaging_mkvmerge.json` within `host` folder in a text editor. Set value of `"path"` to local path `native-messaging-host.js`.
- Open `install_host.sh` and `uninstall_host.sh` within `host` folder in a text editor. Set the value of `TARGET_DIR` within `install_host.sh` and `uninstall_host.sh` to point to `NativeMessagingHost` folder within Chromium user data directory.
- Set `mkvmerge`, `.js` and `.sh` files executable.
- Install `nodejs`.
- Run `./install_host.sh`. 
- At `chrome://extensions` set `Developer mode` to on. 
- Click `Load unpacked`.
- Select `app` folder.

# Usage 
- Click `Apps` on Chromium browser bookmarks bar. 
- Click `native-messaging-mkvmerge` icon.
- Input URL's to media files the `<video>` element can play, optionally including a media fragment identifier, to fetch delimited by space character at `<textarea>` element, e.g., `<textarea>https://path/to/0.ogg#t=0,2 https://path/to/1.webm#t=0,2 https://path/to/2.mp4 https:/path/to/3.ogv
</textarea>` to be played and recorded using `MediaRecorder`.
- Optionally upload files from `host` folder to `<input type="file" multiple>`.
- Click `Connect`. 
- Click `Send`.
- Grant permission for `"Let sites read this folder"` prompt
- Grant permission for `"Save changes to original files"` prompt

Output: A `<video>` element will be appended to the `HTML` `document` with `src` to a `Blob URL` representation of the merged media files as a `Blob`.

Note: If the resulting `Blob` does not display all of the merged videos the first time `Connect` and `Send` are clicked, navigate to `chrome://extensions` select the extension, click the reload symbol to the right of `Details` and `Remove`, then repeat the above process.

# Uninstall
Navigate to `chrome://extensions`, select the extenion, click `Remove`. Run `./uninstall_host.sh`.
