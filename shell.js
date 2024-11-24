#!/usr/bin/env node

/**
 * A shebang (#!) at the top of your script tells the operating 
 * system which interpreter to use for execution. Since we're 
 * using Node.js, add this line as the very first line in shell.js:
 * javascript
 * Copy code
 */

/** Spawn meaning:
 * To appear, or cause (something or someone) to appear, unexpectedly and seemingly out of nowhere.
 */ 

const readline = require("readline");
// To execute system commands, use Node.js’s child_process 
// module, which allows you to spawn new processes.
const { spawn } = require("child_process");
// The child_process module enables us to access Operating System 
// functionalities by running any system command inside a, well, 
// child process.
const fs = require("fs");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

// Function to update the prompt dynamically
function updatePrompt() {
    const cwd = process.cwd(); // Get the current working directory
    rl.setPrompt(`cmShell ${cwd}> `);
    rl.prompt();
}

// Display the initial prompt
updatePrompt();

rl.on("line", (line) => {
    const input = line.trim();
    const args = parseInput(input);

    if (!handleRedirection(args)) {
        const command = args[0];
        const commandArgs = args.slice(1);

        if (!handleBuiltIn(command, commandArgs)) {
            executeCommand(command, commandArgs);
        }
    }
});

// Function to parse input
function parseInput(input) {
    return input.split(" ").filter(Boolean); // Split by spaces and remove empty elements
}

// Function to handle built-in commands
function handleBuiltIn(command, args) {
    switch (command) {
        case "exit": // Exit the shell
            rl.close();
            return true;
        case "echo": // Print to the console
            console.log(args.join(" "));
            return true;
        case "cd": // Change directory
            changeDirectory(args[0]);
            return true;
        case "ls": // List directory contents
            listDirectoryContents(args[0] || ".");
            return true;
        default:
            return false;
    }
}

// Function to execute external commands
function executeCommand(command, args) {
    const isBackground = args[args.length - 1] === "&";
    if (isBackground) {
        args = args.slice(0, -1); // Remove '&' from arguments
    }

    const process = spawn(command, args, { stdio: "inherit", shell: true });

    if (!isBackground) {
        process.on("close", () => {
            updatePrompt();
        });
    } else {
        updatePrompt();
    }
}

// Function to change the directory
function changeDirectory(dir) {
    if (!dir) {
        console.log("No directory specified");
    } else {
        try {
            process.chdir(dir); // Change the current working directory
        } catch (err) {
            console.error(`Error: ${err.message}`);
        }
    }
    updatePrompt();
}

// Function to list directory contents
function listDirectoryContents(dir) {
    fs.readdir(dir, { withFileTypes: true }, (err, files) => {
        if (err) {
            console.error(`Error: ${err.message}`);
        } else {
            files.forEach((file) => {
                console.log(file.isDirectory() ? `[DIR] ${file.name}` : file.name);
            });
        }
        updatePrompt();
    });
}

// Function to handle input/output redirection
function handleRedirection(args) {
    const outputIndex = args.indexOf(">");
    const inputIndex = args.indexOf("<");

    if (outputIndex > -1) {
        const command = args.slice(0, outputIndex);
        const outputFile = args[outputIndex + 1];
        if (!outputFile) {
            console.error("Error: No output file specified");
            updatePrompt();
            return true;
        }

        const commandProcess = spawn(command[0], command.slice(1), { shell: true });
        const writeStream = fs.createWriteStream(outputFile);

        commandProcess.stdout.pipe(writeStream);
        commandProcess.stderr.pipe(process.stderr);

        commandProcess.on("close", () => {
            writeStream.close();
            updatePrompt();
        });
        return true;
    }

    if (inputIndex > -1) {
        const command = args.slice(0, inputIndex);
        const inputFile = args[inputIndex + 1];
        if (!inputFile) {
            console.error("Error: No input file specified");
            updatePrompt();
            return true;
        }

        const readStream = fs.createReadStream(inputFile);
        const commandProcess = spawn(command[0], command.slice(1), { shell: true, stdio: ["pipe", "inherit", "inherit"] });

        readStream.pipe(commandProcess.stdin);

        commandProcess.on("close", () => {
            updatePrompt();
        });
        return true;
    }

    return false;
}

// Event handler for closing the shell
rl.on("close", () => {
    console.log("Exiting cmShell...");
    process.exit(0);
});