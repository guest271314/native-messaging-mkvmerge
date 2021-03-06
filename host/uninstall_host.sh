#!/bin/sh
# Copyright 2013 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

set -e
# path to NativeMessagingHosts in Chromium user data directory at *nix
# adjust path to NativeMessagingHost at the OS, browser used, here
TARGET_DIR="$HOME/.config/chromium/NativeMessagingHosts"
HOST_NAME="native_messaging_mkvmerge"
rm "$TARGET_DIR/$HOST_NAME.json"
echo "Native messaging host $HOST_NAME has been uninstalled."
