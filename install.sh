#!/bin/bash

# Define global variables
MANPAGE_FILE="spotituby.1"
MANPAGE_COMMAND="spotituby"
MANPAGE_DIR="/usr/local/share/man/man1"
APP_NAME="Spotituby"
NPM_PACKAGE="spotituby"
PYTHON_ENV=".venv"
PYTHON_PKGS="requirements.txt"

red="\033[0;31m"
yellow="\033[0;33m"
green="\033[0;32m"
blue="\033[0;34m"
magenta="\033[0;35m"
cyan="\033[0;36m"
reset="\033[0m"


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
# - man (for installing manpages)
# - npm (for installing the Node.js package)
# - python3 (for running the Python environment)
check_dependencies() {
    echo "Checking dependencies..."
    if ! command -v man &> /dev/null; then
        echo "Error: 'man' is not installed. Install it with your package manager."
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
        if [ ! -d "$MANPAGE_DIR" ]; then
            mkdir -p "$MANPAGE_DIR" || { echo "Failed to create manpage directory"; exit 1; }
        fi
        cp "$MANPAGE_FILE" "$MANPAGE_DIR/" || { echo "Failed to copy manpage file"; exit 1; }
        if man -w "$MANPAGE_COMMAND" > /dev/null 2>&1; then
            echo "Manpage installed succesfully"
        else
            echo "Failed to install manpage"
            exit 1
        fi
        echo "Manpage installed and database updated."
    else
        echo "Manpage file not found: $MANPAGE_FILE"
        exit 1
    fi
}

uninstall_manpage() {
    if [ -f "$MANPAGE_FILE" ]; then
        echo "Uninstalling manpage..."

        if [ -d "$MANPAGE_DIR" ]; then
            rm "$MANPAGE_DIR/$MANPAGE_FILE" || { echo "Failed to remove manpage file"; exit 1; }
            if [ "$(ls -A "$MANPAGE_DIR")" == "" ]; then
                rmdir "$MANPAGE_DIR" || { echo "Failed to remove empty manpage directory"; exit 1; }
            fi
        else
            echo "Manpage directory does not exist"
            exit
        fi
        if ! man -w "$MANPAGE_COMMAND" > /dev/null 2>&1; then
            echo "Manpage uninstalled succesfully"
        else
            echo "Failed to uninstall manpage"
            exit 1
        fi
        echo "Manpage uninstalled and database updated."
    else
        echo "Manpage file not found: $MANPAGE_FILE"
        exit 1
    fi
}

uninstall_app() {
    echo "Uninstalling $APP_NAME application..."

    if [ ! -z "$PYTHON_ENV" ]; then
        echo "Deactivating virtual environment..."
        deactivate
    else
        echo "No active virtual environment detected."
    fi

    if [ -d "$PYTHON_ENV" ]; then
        echo "Removing Python virtual environment..."
        rm -rf "$PYTHON_ENV"
    else
        echo "Python virtual environment not found. Skipping removal."
    fi

    # Uninstall the Node.js application globally
    echo "Removing Node.js application..."
    if npm list -g "$NPM_PACKAGE" > /dev/null 2>&1; then
        npm uninstall -g "$NPM_PACKAGE"
        echo "Node.js application uninstalled."
    else
        echo "Node.js application not found. Skipping removal."
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

    deactivate
}


meep=$(printf '%b' "\
${cyan}        ______
${cyan}       /ゝ    フ
${green}      |   _  _|  I'm a cat
${green}      /,ミ__Xノ   I sleep everywhere, anywhere, all at once
${yellow}    /       |     - Rufus, probably in his head idk
${yellow}   /  \    ノ
${red} __│  | |  |
${red}/ _|   | |  |
${blue}|(_\___\_)__)
${blue} \_つ${reset}")


main() {
    # Implement Install/Update/Uninstall Wizard
    check_root
    printf "%b" "$meep"
    
    while true; do
       echo -e "${magenta}--------------------------------${reset}"
        echo -e "${yellow} 1. Install${reset}"
        echo -e "${yellow} 2. Update${reset}"
        echo -e "${yellow} 3. Uninstall${reset}"
        echo -e "${yellow} 4. Cancel${reset}"
        echo -e "${magenta}--------------------------------${reset}"
        read -p -r "Choose an option: " option

        case $option in
            1)
                check_dependencies
                install_manpage
                install_app
                echo "Installation complete."
                echo "You can now use the 'spotituby' command and view the manpage using 'man spotituby'."
                exit 0
                ;;
            2)
                echo "Not implemented yet"
                exit 1
                ;;
            3)
                uninstall_manpage
                uninstall_app
                echo -e "${green}Uninstallation complete.\n${yellow}See you soon 👋😢${reset}"
                exit 0
                ;;
            4)
                echo "Cancelled"
                exit 1
                ;;
            *)
                echo -e "${red}Invalid option. Please try again.${reset}"
                ;;
        esac
    done
}

main


