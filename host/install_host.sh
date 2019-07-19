#!/bin/sh
# Copyright 2013 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

set -e

DIR="$( cd "$( dirname "$0" )" && pwd )"
# path to NativeMessagingHosts in Chromium user data directory at *nix
# adjust path to NativeMessagingHost at the OS, browser used, here
TARGET_DIR="$HOME/.config/chromium/NativeMessagingHosts"
# name of native messging host
HOST_NAME="native_messaging_mkvmerge"
# Create directory to store native messaging host.
mkdir -p "$TARGET_DIR"
# Copy native messaging host manifest.
cp "$DIR/$HOST_NAME.json" "$TARGET_DIR"
# Set permissions for the manifest so that all users can read it.
chmod o+r "$TARGET_DIR/$HOST_NAME.json"
echo "Native messaging host $HOST_NAME has been installed."
