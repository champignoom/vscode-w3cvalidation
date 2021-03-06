/*
 * Copyright (c) Makoto Sakaguchi. All rights reserved.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 */

// @ts-check

"use strict";

import { spawn, execFile } from "child_process";
import { promisify } from "util";
const execFilePromise = promisify(execFile);

/**
 * Working directory where the NPM command is executed
 * @readonly
 */
const projects = ["./build/service-updater", "./test", "./client", "./server"];

/**
 * NPM command runner
 *
 * @param {string} command NPM command to be executed
 * @yields Resolved the `Promise` with no arguments upon success.
 */
async function* run(command) {
    for (const project of projects) {
        yield new Promise((resolve, reject) => {
            process.stdout.write(`${project}\n`);
            const runner = spawn("npm", [command], { cwd: project, shell: true });

            runner.stdout.pipe(process.stdout);
            runner.stderr.pipe(process.stderr);

            runner.on("close", (code) => (code === 0) ? resolve() : reject());
            runner.on("error", (err) => reject(err));
        });
    }
}

/**
 * NPM command runner
 *
 * @param {string} command NPM command to be executed
 * @param {string} cwd Working directory where NPM command will be executed
 * @returns {Promise<void>} Resolved the `Promise` with no arguments upon success.
 */
async function runWithCWD(command, cwd) {
    return new Promise((resolve, reject) => {
        const runner = spawn("npm", [command], { cwd, shell: true });

        runner.stdout.pipe(process.stdout);
        runner.stderr.pipe(process.stderr);

        runner.on("close", (code) => ((code === 0) ? resolve() : reject()));
        runner.on("error", (err) => reject(err));
    });
}

const postinstall = async () => { for await (const _project of run("install")) { } };

/** @type {(cwd: string) => Promise<{ stdout: string }>} */
const outdate = async (cwd) => execFilePromise("npm", ["outdate"], { cwd, shell: true })
    .catch((err) => (!err.stderr) ? { stdout: err.stdout } : Promise.reject(err));

/** @type {(message: string) => Promise<string>} */
function prompt(message) {
    process.stdout.write(message);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    return new Promise((r) => process.stdin.once("data", r))
        .finally(() => process.stdin.pause());
}

async function update() {
    console.clear();
    for (const project of projects) {
        const { stdout } = await outdate(project);
        if (!stdout) continue;

        process.stdout.write(`${stdout}\n`);
        const ans = (await prompt("Do you want to update these package(s)? (yes): ")).trim().toLowerCase();

        if (ans !== "" && (ans !== "yes" && ans !== "y")) continue;
        await runWithCWD("update", project);
    }
}

async function main(/** @type string */ command) {
    switch (command) {
        case "install": return await postinstall();
        case "update": return await update();
        default: return;
    }
}

if (process.mainModule === undefined) main(process.argv[2]);
