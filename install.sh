#!/bin/bash

# Define global variables
MANPAGE_FILE="music-downloader.1"
MANPAGE_DIR="/usr/local/share/man/man1"
APP_NAME="Spotituby"
NPM_PACKAGE="spotituby"
PYTHON_ENV=".venv"
PYTHON_PKGS="requirements.txt"


# Check if the script is run as root. If not, exit with a message
# requesting the user to run the script with sudo.
check_root() {
    if [ "$(id -u)" -ne "0" ]; then
        echo "This script must be run as root. Use sudo."
        exit 1
    fi
}


# Check that all dependencies are installed. The dependencies are:
#
# - mandb (for installing manpages)
# - npm (for installing the Node.js package)
# - python3 (for running the Python environment)
check_dependencies() {
    echo "Checking dependencies..."
    if ! command -v mandb &> /dev/null; then
        echo "Error: 'mandb' is not installed. Install it with your package manager."
        exit 1
    fi
    if ! command -v npm &> /dev/null; then
        echo "Error: 'npm' is not installed. Install Node.js and npm first."
        exit 1
    fi
    if ! command -v python3 &> /dev/null; then
        echo "Error: 'python3' is not installed. Install Python first."
        exit 1
    fi
}


# Activate the Python virtual environment. If it does not exist, create one.
#
# This function looks for the virtual environment in the current directory.
# If it does not exist, it creates one. Otherwise, it sources the activate
# script to activate the virtual environment.
activate_virtualenv() {
    if [ -d "$PYTHON_ENV" ]; then
        echo "Activating Python virtual environment..."
        source "$PYTHON_ENV/bin/activate"
    else
        echo "Virtual environment not found. Creating one..."
        python3 -m venv "$PYTHON_ENV"
        source "$PYTHON_ENV/bin/activate"
    fi
}


# Install the manpage for the application to the system manpage directory.
#
# Check if the manpage file exists. If it does, copy it to the system manpage
# directory and update the manpage database.
#
# If the manpage file does not exist, exit with an error message.
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


# Install the application, including Python and Node.js dependencies.
#
# This function installs the Python virtual environment, installs yt-dlp
# in the virtual environment, and installs the Node.js package globally.
install_app() {
    echo "Installing $APP_NAME application..."

    # Activate Python environment
    activate_virtualenv

    # Install yt-dlp in the virtual environment
    echo "Installing Python dependencies..."
    pip install -r "${PYTHON_PKGS}"

    # Install the Node.js package globally
    echo "Installing Node.js dependencies..."
    npm install -g "$NPM_PACKAGE"

    echo "Application installed."
}


check_root
check_dependencies
install_manpage
install_app

echo "Installation complete."
echo "You can now use the 'spotituby' command and view the manpage using 'man spotituby'."
