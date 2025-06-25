#!/bin/bash

# Enable autocomplete for file input
read -e -p "Enter the name of the C file: " file

# Check if file exists
if [[ ! -f "$file" ]]; then
    echo "❌ File '$file' not found."
    exit 1
fi

# Define output executable name
executable="./a.out"

# Remove previous executable if exists
if [[ -f "$executable" ]]; then
    echo "🗑️  Removing previous executable..."
    rm "$executable"
fi

# Compile the C file
echo "🛠️  Compiling '$file'..."
gcc "$file" -o "$executable"
compile_status=$?

if [[ $compile_status -ne 0 ]]; then
    echo "❌ Compilation failed."
    exit $compile_status
fi

# Run the executable
echo "🚀 Running '$executable'..."
echo "--------------------------------"
"$executable"
