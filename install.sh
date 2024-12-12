#!/bin/bash

# Define global variables
MANPAGE_FILE="spotituby.1"
MANPAGE_COMMAND="spotituby"
APP_NAME="Spotituby"
NPM_PACKAGE="spotituby"
PYTHON_ENV=".venv"
PYTHON_PKGS="requirements.txt"

# OS-specific configurations
case "$(uname -s)" in
    Darwin*)    # macOS
        MANPAGE_DIR="/usr/local/share/man/man1"
        NEED_SUDO=true
        ;;
    Linux*)     # Linux
        MANPAGE_DIR="/usr/local/share/man/man1"
        NEED_SUDO=true
        ;;
    MINGW*|CYGWIN*|MSYS*)    # Windows
        MANPAGE_DIR="$HOME/man/man1"
        NEED_SUDO=false
        ;;
    *)
        echo "Unsupported operating system"
        exit 1
        ;;
esac

# Colors
red="\033[0;31m"
yellow="\033[0;33m"
green="\033[0;32m"
blue="\033[0;34m"
magenta="\033[0;35m"
cyan="\033[0;36m"
reset="\033[0m"

# Check if sudo is needed and available
check_privileges() {
    if [ "$NEED_SUDO" = true ] && [ "$(id -u)" -ne "0" ]; then
        echo -e "${red}This script must be run with sudo on this system.${reset}"
        exit 1
    fi
}

# Check for required dependencies based on OS
check_dependencies() {
    echo "Checking dependencies..."
    local missing_deps=()

    # Common dependencies
    if ! command -v npm &> /dev/null; then
        missing_deps+=("npm/Node.js")
    fi
    if ! command -v python3 &> /dev/null; then
        missing_deps+=("python3")
    fi

    # OS-specific dependency checks
    case "$(uname -s)" in
        Darwin*)    # macOS
            if ! command -v brew &> /dev/null; then
                missing_deps+=("homebrew")
            fi
            ;;
        Linux*)     # Linux
            if ! command -v man &> /dev/null; then
                missing_deps+=("man-db")
            fi
            ;;
        MINGW*|CYGWIN*|MSYS*)    # Windows
            if ! command -v git &> /dev/null; then
                missing_deps+=("git")
            fi
            ;;
    esac

    if [ ${#missing_deps[@]} -ne 0 ]; then
        echo -e "${red}Missing dependencies: ${missing_deps[*]}${reset}"
        echo "Please install the missing dependencies and try again."
        exit 1
    fi
}

# Activate/create Python virtual environment
activate_virtualenv() {
    if [ -d "$PYTHON_ENV" ]; then
        echo "Activating Python virtual environment..."
        source "$PYTHON_ENV/bin/activate" || {
            echo -e "${red}Failed to activate virtual environment${reset}"
            exit 1
        }
    else
        echo "Creating new virtual environment..."
        python3 -m venv "$PYTHON_ENV" || {
            echo -e "${red}Failed to create virtual environment${reset}"
            exit 1
        }
        source "$PYTHON_ENV/bin/activate"
    fi
}

# Install/update manpage
install_manpage() {
    if [ -f "$MANPAGE_FILE" ]; then
        echo "Installing manpage..."
        mkdir -p "$MANPAGE_DIR" || {
            echo -e "${red}Failed to create manpage directory${reset}"
            return 1
        }
        cp "$MANPAGE_FILE" "$MANPAGE_DIR/" || {
            echo -e "${red}Failed to copy manpage file${reset}"
            return 1
        }
        echo -e "${green}Manpage installed successfully${reset}"
    else
        echo -e "${yellow}Manpage file not found: $MANPAGE_FILE${reset}"
        return 0  # Non-critical error
    fi
}

# Remove manpage
uninstall_manpage() {
    if [ -f "$MANPAGE_DIR/$MANPAGE_FILE" ]; then
        echo "Removing manpage..."
        rm "$MANPAGE_DIR/$MANPAGE_FILE" || {
            echo -e "${red}Failed to remove manpage file${reset}"
            return 1
        }
        echo -e "${green}Manpage removed successfully${reset}"
    fi
}

# Install application
install_app() {
    echo "Installing $APP_NAME..."
    
    # Check if this is a global npm installation
    if [ "$npm_config_global" = "true" ]; then
        echo "Global npm installation detected..."
        # The postinstall script will handle Python setup
        npm install || {
            echo -e "${red}Failed to install Node.js package${reset}"
            return 1
        }
    else
        # Your existing installation logic
        activate_virtualenv
        echo "Installing Python dependencies..."
        pip install -r "${PYTHON_PKGS}" || {
            echo -e "${red}Failed to install Python dependencies${reset}"
            return 1
        }

        echo "Installing Node.js package..."
        npm install || {
            echo -e "${red}Failed to install Node.js package${reset}"
            return 1
        }

        deactivate
    fi

    echo -e "${green}Installation completed successfully${reset}"
}

# Update application
update_app() {
    echo "Updating $APP_NAME..."
    
    # Update Node.js package
    echo "Updating Node.js package..."
    npm update -g "$NPM_PACKAGE" || {
        echo -e "${red}Failed to update Node.js package${reset}"
        return 1
    }

    # Update Python dependencies
    activate_virtualenv
    echo "Updating Python dependencies..."
    pip install -r "${PYTHON_PKGS}" --upgrade || {
        echo -e "${red}Failed to update Python dependencies${reset}"
        return 1
    }
    deactivate

    # Update manpage
    install_manpage

    echo -e "${green}Update completed successfully${reset}"
}

# Uninstall application
uninstall_app() {
    echo "Uninstalling $APP_NAME..."

    # Remove Node.js package
    if npm list -g "$NPM_PACKAGE" &> /dev/null; then
        echo "Removing Node.js package..."
        npm uninstall -g "$NPM_PACKAGE" || {
            echo -e "${red}Failed to remove Node.js package${reset}"
            return 1
        }
    fi

    # Remove Python virtual environment
    if [ -d "$PYTHON_ENV" ]; then
        echo "Removing Python virtual environment..."
        rm -rf "$PYTHON_ENV" || {
            echo -e "${red}Failed to remove virtual environment${reset}"
            return 1
        }
    fi

    # Remove manpage
    uninstall_manpage

    echo -e "${green}Uninstallation completed successfully${reset}"
}

# ASCII art
show_ascii_art() {
    printf '%b' "\
${cyan}        ______
${cyan}       /ゝ    フ
${green}      |   _  _|  I'm a cat
${green}      /,ミ__Xノ   I sleep everywhere, anywhere, all at once
${yellow}    /       |     - Rufus, probably in his head idk
${yellow}   /  \    ノ
${red} __│  | |  |
${red}/ _|   | |  |
${blue}|(_\___\_)__)
${blue} \_つ${reset}\n"
}

# Main menu
main() {
    check_privileges
    show_ascii_art
    
    while true; do
        echo -e "${magenta}--------------------------------${reset}"
        echo -e "${yellow} 1. Install${reset}"
        echo -e "${yellow} 2. Update${reset}"
        echo -e "${yellow} 3. Uninstall${reset}"
        echo -e "${yellow} 4. Cancel${reset}"
        echo -e "${magenta}--------------------------------${reset}"
        read -p "Choose an option: " option

        case $option in
            1)
                check_dependencies
                install_app && install_manpage
                echo -e "${green}You can now use 'spotituby' command and view the manpage using 'man spotituby'${reset}"
                break
                ;;
            2)
                check_dependencies
                update_app
                break
                ;;
            3)
                uninstall_app
                echo -e "${yellow}See you soon 👋😢${reset}"
                break
                ;;
            4)
                echo -e "${yellow}Installation cancelled${reset}"
                exit 0
                ;;
            *)
                echo -e "${red}Invalid option. Please try again.${reset}"
                ;;
        esac
    done
}

main


