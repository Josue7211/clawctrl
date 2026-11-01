// Generated from shared/contracts/notes.openapi.json; run npm run contract:generate.
export interface paths {
    "/api/vault/local/documents": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listNotes"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/vault/local/doc": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["readNote"];
        /** @description Create if absent without _rev; update only with current _rev. Stable operation_id plus identical request body replays the original receipt without another write. Reusing an operation ID for a different request conflicts. IDs and revisions are opaque. */
        put: operations["writeNote"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        NoteId: string & (unknown & unknown & unknown & unknown);
        /** @description Opaque current revision; retain exactly for the next conditional write. */
        NoteRevision: string;
        /** @description Unix epoch milliseconds. */
        Timestamp: number;
        OperationId: string;
        /**
         * @example {
         *       "_id": "Workspace/Review note.md",
         *       "_rev": "local-1768478400000",
         *       "type": "note",
         *       "title": "Review note",
         *       "folder": "Workspace",
         *       "content": "# Review note\n\nA fixed sample note for feature review.\n",
         *       "tags": [],
         *       "links": [],
         *       "aliases": [],
         *       "properties": {},
         *       "created_at": 1768478400000,
         *       "updated_at": 1768478400000
         *     }
         */
        NoteDocument: {
            _id: components["schemas"]["NoteId"];
            _rev: components["schemas"]["NoteRevision"];
            /** @constant */
            type: "note";
            title: string;
            content: string;
            folder: string;
            tags: string[];
            links: string[];
            aliases?: string[];
            properties?: {
                [key: string]: string | string[];
            };
            created_at: components["schemas"]["Timestamp"];
            updated_at: components["schemas"]["Timestamp"];
            trashed_at?: number | null;
            trash_origin_path?: string | null;
        };
        NoteWrite: {
            _id?: components["schemas"]["NoteId"];
            _rev?: components["schemas"]["NoteRevision"];
            /** @constant */
            type?: "note";
            title?: string;
            content: string;
            folder?: string;
            tags?: string[];
            links?: string[];
            aliases?: string[];
            properties?: {
                [key: string]: string | string[];
            };
            created_at?: components["schemas"]["Timestamp"];
            updated_at?: components["schemas"]["Timestamp"];
            trashed_at?: number | null;
            trash_origin_path?: string | null;
            content_json?: unknown;
            operation_id?: components["schemas"]["OperationId"];
        } & {
            [key: string]: unknown;
        };
        NoteListData: {
            notes: components["schemas"]["NoteDocument"][];
            attachments: {
                [key: string]: unknown;
            }[];
        };
        NoteWriteData: {
            id: components["schemas"]["NoteId"];
            rev: components["schemas"]["NoteRevision"];
        };
        ErrorResponse: {
            /** @constant */
            ok: false;
            error: string;
            /** @enum {string} */
            code: "bad_request" | "not_found" | "conflict" | "internal_error" | "service_unavailable";
        };
        NoteListResponse: {
            /** @constant */
            ok: true;
            data: components["schemas"]["NoteListData"];
        };
        NoteReadResponse: {
            /** @constant */
            ok: true;
            data: components["schemas"]["NoteDocument"];
        };
        NoteWriteResponse: {
            /** @constant */
            ok: true;
            data: components["schemas"]["NoteWriteData"];
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    listNotes: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description NoteListResponse */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["NoteListResponse"];
                };
            };
            /** @description ErrorResponse */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                    "text/plain": string;
                };
            };
            /** @description Authentication required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": "Authentication required" | "Unauthorized: invalid or missing API key";
                };
            };
            /** @description MFA verification required */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": "MFA verification required";
                };
            };
            /** @description ErrorResponse */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Temporarily unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    readNote: {
        parameters: {
            query: {
                id: components["schemas"]["NoteId"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description NoteReadResponse */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["NoteReadResponse"];
                };
            };
            /** @description ErrorResponse */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                    "text/plain": string;
                };
            };
            /** @description Authentication required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": "Authentication required" | "Unauthorized: invalid or missing API key";
                };
            };
            /** @description MFA verification required */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": "MFA verification required";
                };
            };
            /** @description ErrorResponse */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description ErrorResponse */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Temporarily unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    writeNote: {
        parameters: {
            query: {
                id: components["schemas"]["NoteId"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["NoteWrite"];
            };
        };
        responses: {
            /** @description NoteWriteResponse */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["NoteWriteResponse"];
                };
            };
            /** @description ErrorResponse */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                    "text/plain": string;
                };
            };
            /** @description Authentication required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": "Authentication required" | "Unauthorized: invalid or missing API key";
                };
            };
            /** @description MFA verification required */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": "MFA verification required";
                };
            };
            /** @description ErrorResponse */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Request extraction rejected */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            /** @description Request extraction rejected */
            415: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            /** @description Request extraction rejected */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            /** @description ErrorResponse */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Temporarily unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
}
