/*
* Copyright (c) Makoto Sakaguchi. All rights reserved.
* Licensed under the MIT License. See LICENSE in the project root for license information.
*/
"use strict";

import * as http from "http";
import { TextDocument } from "vscode-languageserver";

/**
 * The validation result format
 */
interface ValidationResult {
    readonly url?: string;
    readonly messages: Message[] | [];

    /*
     * The "source" object
     */
    readonly source?: {
        /*
         * See https://github.com/validator/validator/wiki/Output-%C2%BB-JSON#the-code-string
         */
        readonly code: string;

        /*
         * See https://github.com/validator/validator/wiki/Output-%C2%BB-JSON#the-type-string-1
         */
        readonly type?: string;

        /*
         * See https://github.com/validator/validator/wiki/Output-%C2%BB-JSON#the-encoding-string
         */
        readonly encoding?: string;
    };

    /*
     * See https://github.com/validator/validator/wiki/Output-%C2%BB-JSON#the-language-string
     */
    readonly language?: string;
}//ValidationResult

/**
 * Message object of the validation result
 */
interface Message {
    /*
     * "info" is an informational message or warning that does not affect the validity of the document being checked.
     * "error" signifies a problem that causes the validation/checking to fail.
     * "non-document-error" indicates that the examination ended in an indeterminate state because the document being validated could not be examined to the end.
     */
    readonly type: "info" | "error" | "non-document-error";

    /*
     * type: "info" is "warning" (something questionable issue); in the absence of the "subtype" key, general information
     * type: "error" is "fatal" (an XML well-formedness error or the implementer's requirements in the case of HTML); in the absence of the "subtype" key, a spec violation in general
     * type: "non-document-error" are:
     *  "io" (an input/output error)
     *  "schema" (initializing a schema-based validator failed)
     *  "internal" (the validator/checker found an error bug in itself, ran out of memory, etc.)
     *  Undefined is a problem external to the document in general
     */
    readonly subType?: "warning" | "fatal" | "io" | "schema" | "internal";

    /*
     * See https://github.com/validator/validator/wiki/Output-%C2%BB-JSON#the-message-string
     */
    readonly message?: string;

    /*
     * See https://github.com/validator/validator/wiki/Output-%C2%BB-JSON#the-extract-string
     */
    readonly extract?: string;

    /*
     * The "offset" number is an UTF-16 code unit index into the "extract". The first code unit has the index 0.
     */
    readonly offset?: number;

    /*
     * See https://github.com/validator/validator/wiki/Output-%C2%BB-JSON#the-url-string
     */
    readonly url?: string;

    /*
     * The "firstLine", "firstColumn", "lastLine" and "lastColumn"
     * indicate a range of source code associated with the message.
     * The line and column numbers are one-based:
     *   The first line is line 1
     *   The first column is column 1
     */
    readonly firstLine?: number; // If the attribute is missing, it is the same value as "lastLine".
    readonly firstColumn?: number;
    readonly lastLine?: number;
    readonly lastColumn?: number;
}

const RequestOptions: http.RequestOptions = {
    hostname: "localhost",
    port: 8888,
    path: "/?out=json",
    method: "POST",
    headers: {
        "User-Agent": "Validator.nu/LV",
    },
};

const MediaTypes: { [key: string]: string } = {
    html: "text/html",
    css: "text/css",
    svg: "image/svg+xml",
};

function setContentType(languageId: string): void {
    RequestOptions.headers["Content-Type"] = `${MediaTypes[languageId]}; charset=utf-8`;
}// setContentType

/*
 * Sends document to the local validation server
 */
export function sendDocument(document: TextDocument): Promise<Message[]> {
    return new Promise((resolve, reject) => {
        // Set the request headers
        setContentType(document.languageId);

        const request = http.request(RequestOptions, (response) => {
            // handle http errors
            if (response.statusCode < 200 || response.statusCode > 299) { reject(); }

            // temporary data holder
            response.setEncoding("utf8");
            let body = "";

            // on every content chunk, push it to the data array
            response.on("data", (chunk) => body += chunk);

            // we are done, resolve promise with those joined chunks
            response.on("end", () => resolve((JSON.parse(body) as ValidationResult).messages));
        });

        // handle connection errors of the request
        request.on("error", (err) => reject(err));

        // write data to request body
        request.write(document.getText());
        request.end();
    });
}// sendDocument