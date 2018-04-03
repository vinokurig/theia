/*
 * Copyright (C) 2018 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { expect } from 'chai';
import { NavigationLocation } from './navigation-location';
import { NavigationLocationUpdater } from './navigation-location-updater';

// tslint:disable:no-unused-expression

describe('navigation-location-updater', () => {

    const updater = new NavigationLocationUpdater();
    const CURSOR = NavigationLocation.Type.CURSOR;
    const SELECTION = NavigationLocation.Type.SELECTION;
    const CONTENT_CHANGE = NavigationLocation.Type.CONTENT_CHANGE;

    it('should never affect a location if they belong to different resources', () => {
        const actual = updater.affects(
            NavigationLocation.create('file:///a', CURSOR, { line: 0, character: 0, }),
            NavigationLocation.create('file:///b', CURSOR, { line: 0, character: 0, })
        );
        expect(actual).to.be.false;
    });

    it('should shift the position to left if deleting before', () => {
        const actual = updater.affects(
            NavigationLocation.create('file:///a', SELECTION, { start: { line: 0, character: 10 }, end: { line: 0, character: 15 } }),
            NavigationLocation.create('file:///a', CONTENT_CHANGE, [{
                range: { start: { line: 0, character: 3 }, end: { line: 0, character: 5 } },
                text: '',
                rangeLength: 10
            }]),
        );
        expect(actual).to.be.deep.equal(NavigationLocation.create('file:///a', SELECTION, { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }));
    });

});
