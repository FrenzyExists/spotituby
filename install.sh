#!/bin/bash

# Define variables
MANPAGE_FILE="musictool.1"
MANPAGE_DIR="/usr/local/share/man/man1"
APP_NAME="your-typescript-app"
NPM_PACKAGE="your-typescript-app"

# Function to check if the script is run as root
check_root() {
    if [ "$(id -u)" -ne "0" ]; then
        echo "This script must be run as root. Use sudo."
        exit 1
    fi
}

# Function to install the manpage
install_manpage() {
    if [ -f "$MANPAGE_FILE" ]; then
        echo "Installing manpage..."
        mkdir -p "$MANPAGE_DIR"
        cp "$MANPAGE_FILE" "$MANPAGE_DIR/"
        mandb
        echo "Manpage installed and database updated."
    else
        echo "Manpage file not found: $MANPAGE_FILE"
        exit 1
    fi
}

# Function to install the TypeScript application
install_app() {
    echo "Installing TypeScript application..."
    npm install -g "$NPM_PACKAGE"
    echo "Application installed."
}

# Main script execution
check_root
install_manpage
install_app

echo "Installation complete. You can now use the 'musictool' command and view the manpage using 'man musictool'."
