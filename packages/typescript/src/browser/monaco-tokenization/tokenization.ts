/*
 * Copyright (C) 2017 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// copied from https://github.com/Microsoft/monaco-typescript/tree/v2.3.0 and only slightly modified (imports and linting)

'use strict';

// tslint:disable:indent
// tslint:disable:no-var-keyword
// tslint:disable:one-variable-per-declaration
// tslint:disable:prefer-const
import ts = require('monaco-typescript/release/min/lib/typescriptServices');

export enum Language {
	TypeScript,
	EcmaScript5
}

export function createTokenizationSupport(language: Language): monaco.languages.TokensProvider {

	var classifier = ts.createClassifier(),
		bracketTypeTable = language === Language.TypeScript ? tsBracketTypeTable : jsBracketTypeTable,
		tokenTypeTable = language === Language.TypeScript ? tsTokenTypeTable : jsTokenTypeTable;

	return {
		getInitialState: () => new State(language, ts.EndOfLineState.None, false),
		tokenize: (line, state) => tokenize(bracketTypeTable, tokenTypeTable, classifier, <State>state, line)
	};
}

class State implements monaco.languages.IState {

	public language: Language;
	public eolState: /*ts.EndOfLineState*/ any;
	public inJsDocComment: boolean;

	constructor(language: Language, eolState: /*ts.EndOfLineState*/ any, inJsDocComment: boolean) {
		this.language = language;
		this.eolState = eolState;
		this.inJsDocComment = inJsDocComment;
	}

	public clone(): State {
		return new State(this.language, this.eolState, this.inJsDocComment);
	}

	public equals(other: monaco.languages.IState): boolean {
		if (other === this) {
			return true;
		}
		if (!other || !(other instanceof State)) {
			return false;
		}
		if (this.eolState !== (<State>other).eolState) {
			return false;
		}
		if (this.inJsDocComment !== (<State>other).inJsDocComment) {
			return false;
		}
		return true;
	}
}

function tokenize(bracketTypeTable: { [i: number]: string }, tokenTypeTable: { [i: number]: string },
	classifier: /*ts.Classifier*/ any, state: State, text: string): monaco.languages.ILineTokens {

	// Create result early and fill in tokens
	var ret = {
		tokens: <monaco.languages.IToken[]>[],
		endState: new State(state.language, ts.EndOfLineState.None, false)
	};

	function appendFn(startIndex: number, type: string): void {
		if (ret.tokens.length === 0 || ret.tokens[ret.tokens.length - 1].scopes !== type) {
			ret.tokens.push({
				startIndex: startIndex,
				scopes: type
			});
		}
	}

	var isTypeScript = state.language === Language.TypeScript;

	// shebang statement, #! /bin/node
	if (!isTypeScript && checkSheBang(0, text, appendFn)) {
		return ret;
	}

	var result = classifier.getClassificationsForLine(text, state.eolState, true),
		offset = 0;

	ret.endState.eolState = result.finalLexState;
	ret.endState.inJsDocComment = result.finalLexState === ts.EndOfLineState.InMultiLineCommentTrivia && (state.inJsDocComment || /\/\*\*.*$/.test(text));

	for (let entry of result.entries) {

		var type: string;

		if (entry.classification === ts.TokenClass.Punctuation) {
			// punctions: check for brackets: (){}[]
			var ch = text.charCodeAt(offset);
			type = bracketTypeTable[ch] || tokenTypeTable[entry.classification];
			appendFn(offset, type);

		} else if (entry.classification === ts.TokenClass.Comment) {
			// comments: check for JSDoc, block, and line comments
			if (ret.endState.inJsDocComment || /\/\*\*.*\*\//.test(text.substr(offset, entry.length))) {
				appendFn(offset, isTypeScript ? 'comment.doc.ts' : 'comment.doc.js');
			} else {
				appendFn(offset, isTypeScript ? 'comment.ts' : 'comment.js');
			}
		} else {
			// everything else
			appendFn(offset,
				tokenTypeTable[entry.classification] || '');
		}

		offset += entry.length;
	}

	return ret;
}

interface INumberStringDictionary {
	[idx: number]: string;
}

var tsBracketTypeTable: INumberStringDictionary = Object.create(null);
tsBracketTypeTable['('.charCodeAt(0)] = 'delimiter.parenthesis.ts';
tsBracketTypeTable[')'.charCodeAt(0)] = 'delimiter.parenthesis.ts';
tsBracketTypeTable['{'.charCodeAt(0)] = 'delimiter.bracket.ts';
tsBracketTypeTable['}'.charCodeAt(0)] = 'delimiter.bracket.ts';
tsBracketTypeTable['['.charCodeAt(0)] = 'delimiter.array.ts';
tsBracketTypeTable[']'.charCodeAt(0)] = 'delimiter.array.ts';

var tsTokenTypeTable: INumberStringDictionary = Object.create(null);
tsTokenTypeTable[ts.TokenClass.Identifier] = 'identifier.ts';
tsTokenTypeTable[ts.TokenClass.Keyword] = 'keyword.ts';
tsTokenTypeTable[ts.TokenClass.Operator] = 'delimiter.ts';
tsTokenTypeTable[ts.TokenClass.Punctuation] = 'delimiter.ts';
tsTokenTypeTable[ts.TokenClass.NumberLiteral] = 'number.ts';
tsTokenTypeTable[ts.TokenClass.RegExpLiteral] = 'regexp.ts';
tsTokenTypeTable[ts.TokenClass.StringLiteral] = 'string.ts';

var jsBracketTypeTable: INumberStringDictionary = Object.create(null);
jsBracketTypeTable['('.charCodeAt(0)] = 'delimiter.parenthesis.js';
jsBracketTypeTable[')'.charCodeAt(0)] = 'delimiter.parenthesis.js';
jsBracketTypeTable['{'.charCodeAt(0)] = 'delimiter.bracket.js';
jsBracketTypeTable['}'.charCodeAt(0)] = 'delimiter.bracket.js';
jsBracketTypeTable['['.charCodeAt(0)] = 'delimiter.array.js';
jsBracketTypeTable[']'.charCodeAt(0)] = 'delimiter.array.js';

var jsTokenTypeTable: INumberStringDictionary = Object.create(null);
jsTokenTypeTable[ts.TokenClass.Identifier] = 'identifier.js';
jsTokenTypeTable[ts.TokenClass.Keyword] = 'keyword.js';
jsTokenTypeTable[ts.TokenClass.Operator] = 'delimiter.js';
jsTokenTypeTable[ts.TokenClass.Punctuation] = 'delimiter.js';
jsTokenTypeTable[ts.TokenClass.NumberLiteral] = 'number.js';
jsTokenTypeTable[ts.TokenClass.RegExpLiteral] = 'regexp.js';
jsTokenTypeTable[ts.TokenClass.StringLiteral] = 'string.js';

function checkSheBang(deltaOffset: number, line: string, appendFn: (startIndex: number, type: string) => void): boolean {
	if (line.indexOf('#!') === 0) {
		appendFn(deltaOffset, 'comment.shebang');
		return true;
	}
	return false;
}
