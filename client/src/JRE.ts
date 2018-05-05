/*
 * Copyright (c) Makoto Sakaguchi. All rights reserved.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 */
"use strict";

import { workspace } from "vscode";

import { execFile } from "child_process";
import * as path from "path";

let javaBinDir: string = "bin";
if (process.platform === "darwin") {
    javaBinDir = "Contents/Home/bin";
}// if

const userJavaHome: string = workspace.getConfiguration("vscode-w3cvalidation").get("javaHome");
if (userJavaHome) {
    process.env.PATH += path.join(path.delimiter, userJavaHome, javaBinDir);
}

const javaHome = process.env.JAVA_HOME;
if (javaHome) {
    process.env.PATH += path.join(path.delimiter, javaHome, javaBinDir);
}

const jdkHome = process.env.JDK_HOME;
if (jdkHome) {
    process.env.PATH += path.join(path.delimiter, jdkHome, javaBinDir);
}

/**
 * Checks JRE version
 *
 * @returns Promise<void> Resolved promise
 */
export function checkJRE(): Promise<void> {
    return new Promise((resolve, reject) => {
        // tslint:disable-next-line:variable-name
        execFile("java", ["-version"], (_error, _stdout, stderr) => {
            const currentVersion = stderr.substring(14, stderr.lastIndexOf("\""));

            (currentVersion >= "1.8") ? resolve() : reject();
        });
    });
}// checkJRE