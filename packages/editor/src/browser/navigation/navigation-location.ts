/*
 * Copyright (C) 2018 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import URI from '@theia/core/lib/common/uri';
import { Position, Range, TextDocumentContentChangeDelta } from '../editor';
export { Position, Range };

export namespace NavigationLocation {

    /**
     * The navigation location type.
     */
    export enum Type {

        /**
         * Cursor position change type.
         */
        CURSOR,

        /**
         * Text selection change type.
         */
        SELECTION,

        /**
         * Content change type.
         */
        CONTENT_CHANGE

    }

}

/**
 * Representation of a navigation location in a text editor.
 */
export interface NavigationLocation {

    /**
     * The URI of the resource opened in the editor.
     */
    readonly uri: URI;

    /**
     * The type of the navigation location.
     */
    readonly type: NavigationLocation.Type;

    /**
     * Context of the navigation location.
     */
    readonly context: Position | Range | TextDocumentContentChangeDelta[];

}

export namespace NavigationLocation {

    /**
     * Transforms the location into an object that can be safely serialized.
     */
    export function toObject(location: NavigationLocation): object {
        const { uri, type } = location;
        const context = (() => {
            if (CursorLocation.is(location)) {
                return CursorLocation.toObject(location.context);
            }
            if (SelectionLocation.is(location)) {
                return SelectionLocation.toObject(location.context);
            }
            if (ContentChangeLocation.is(location)) {
                return ContentChangeLocation.toObject(location.context);
            }
        })();
        return {
            uri: uri.toString(),
            type,
            context
        };
    }

    /**
     * Returns with the navigation location object from its serialized counterpart.
     */
    export function fromObject(object: Partial<NavigationLocation>): NavigationLocation | undefined {
        const { uri, type } = object;
        if (uri !== undefined && type !== undefined && object.context !== undefined) {
            const context = (() => {
                switch (type) {
                    case NavigationLocation.Type.CURSOR: return CursorLocation.fromObject(object.context as Position);
                    case NavigationLocation.Type.SELECTION: return SelectionLocation.fromObject(object.context as Range);
                    case NavigationLocation.Type.CONTENT_CHANGE: return ContentChangeLocation.fromObject(object.context as TextDocumentContentChangeDelta[]);
                }
            })();
            if (context) {
                return {
                    uri: toUri(uri),
                    context,
                    type
                };
            }
        }
        return undefined;
    }

    /**
     * Creates a new cursor location.
     */
    export function create(uri: URI | { uri: URI } | string, type: NavigationLocation.Type.CURSOR, context: Position): CursorLocation;

    /**
     * Creates a new selection location.
     */
    export function create(uri: URI | { uri: URI } | string, type: NavigationLocation.Type.SELECTION, context: Range): SelectionLocation;

    /**
     * Creates a new text content change location type.
     */
    export function create(uri: URI | { uri: URI } | string, type: NavigationLocation.Type.CONTENT_CHANGE, context: TextDocumentContentChangeDelta[]): ContentChangeLocation;

    /**
     * Creates a new navigation location object.
     */
    export function create(uri: URI | { uri: URI } | string, type: NavigationLocation.Type, context: Position | Range | TextDocumentContentChangeDelta[]): NavigationLocation {
        return {
            uri: toUri(uri),
            type,
            context
        };
    }

    function toUri(arg: URI | { uri: URI } | string): URI {
        if (arg instanceof URI) {
            return arg;
        }
        if (typeof arg === 'string') {
            return new URI(arg);
        }
        return arg.uri;
    }

}

/**
 * Navigation location representing the cursor location change.
 */
export interface CursorLocation extends NavigationLocation {

    /**
     * The type is always `cursor`.
     */
    readonly type: NavigationLocation.Type.CURSOR;

    /**
     * The context for the location, that is always a position.
     */
    readonly context: Position;

}

export namespace CursorLocation {

    /**
     * `true` if the argument is a cursor location. Otherwise, `false`.
     */
    export function is(location: NavigationLocation): location is CursorLocation {
        return location.type === NavigationLocation.Type.CURSOR;
    }

    /**
     * Returns with the serialized format of the position argument.
     */
    export function toObject(context: Position): object {
        const { line, character } = context;
        return {
            line,
            character
        };
    }

    /**
     * Returns with the position from its serializable counterpart, or `undefined`.
     */
    export function fromObject(object: Partial<Position>): Position | undefined {
        if (object.line !== undefined && object.character !== undefined) {
            const { line, character } = object;
            return {
                line,
                character
            };
        }
        return undefined;
    }

    /**
     * Converts the position argument into an empty range, where the `start` and the `end` range are the same.
     * If the argument was a range, returns with a reference to the argument.
     */
    export function toRange(position: Position | Range): Range {
        if (Range.is(position)) {
            return position;
        }
        return {
            start: position,
            end: position
        };
    }

}

/**
 * Representation of a selection location.
 */
export interface SelectionLocation extends NavigationLocation {

    /**
     * The `selection` type.
     */
    readonly type: NavigationLocation.Type.SELECTION;

    /**
     * The context of the selection; a range.
     */
    readonly context: Range;

}

export namespace SelectionLocation {

    /**
     * `true` if the argument is a selection location.
     */
    export function is(location: NavigationLocation): location is SelectionLocation {
        return location.type === NavigationLocation.Type.SELECTION;
    }

    /**
     * Converts the range argument into a serializable object.
     */
    export function toObject(context: Range): object {
        const { start, end } = context;
        return {
            start: CursorLocation.toObject(start),
            end: CursorLocation.toObject(end)
        };
    }

    /**
     * Creates a range object from its serializable counterpart. Returns with `undefined` if the argument cannot be converted into a range.
     */
    export function fromObject(object: Partial<Range>): Range | undefined {
        if (!!object.start && !!object.end) {
            const start = CursorLocation.fromObject(object.start);
            const end = CursorLocation.fromObject(object.end);
            if (start && end) {
                return {
                    start,
                    end
                };
            }
        }
        return undefined;
    }
}

/**
 * Content change location type.
 */
export interface ContentChangeLocation extends NavigationLocation {

    /**
     * The type, that is always `content change`.
     */
    readonly type: NavigationLocation.Type.CONTENT_CHANGE;

    /**
     * An array of text document content change deltas as the context.
     */
    readonly context: TextDocumentContentChangeDelta[];

}

export namespace ContentChangeLocation {

    /**
     * `true` if the argument is a content change location. Otherwise, `false`.
     */
    export function is(location: NavigationLocation): location is ContentChangeLocation {
        return location.type === NavigationLocation.Type.CONTENT_CHANGE;
    }

    /**
     * Returns with a serializable object representing the arguments.
     */
    export function toObject(context: TextDocumentContentChangeDelta[]): object {
        return context.map(delta => ({
            range: SelectionLocation.toObject(delta.range),
            rangeLength: delta.rangeLength,
            text: delta.text
        }));
    }

    /**
     * Returns with an array of text document change deltas for the argument. `undefined` if the argument cannot be mapped to an array of content change deltas.
     */
    export function fromObject(object: ArrayLike<Partial<TextDocumentContentChangeDelta>>): TextDocumentContentChangeDelta[] | undefined {
        const result: TextDocumentContentChangeDelta[] = [];
        for (let i = 0; i < object.length; i++) {
            if (!!object[i].range && object[i].rangeLength !== undefined && object[i].text !== undefined) {
                const range = SelectionLocation.fromObject(object[i].range!);
                const rangeLength = object[i].rangeLength;
                const text = object[i].text;
                if (!!range) {
                    result.push({
                        range,
                        rangeLength: rangeLength!,
                        text: text!
                    });
                }
            } else {
                return undefined;
            }
        }
        return result;
    }

}
