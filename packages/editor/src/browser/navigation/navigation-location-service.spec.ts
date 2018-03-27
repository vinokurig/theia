/*
 * Copyright (C) 2018 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */
import { enableJSDOM } from '@theia/core/lib/browser/test/jsdom';

let disableJSDOM = enableJSDOM();

import { expect } from 'chai';
import { Container } from 'inversify';
import { ILogger } from '@theia/core/lib/common/logger';
import { MockLogger } from '@theia/core/lib/common/test/mock-logger';
import { OpenerService } from '@theia/core/lib/browser/opener-service';
import { MockOpenerService } from '@theia/core/lib/browser/test/mock-opener-service';
import { NavigationLocationSimilarity } from './navigation-location-similarity';
import { CursorLocation, Position, NavigationLocation } from './navigation-location';
import { MockNavigationLocationServiceConfiguration } from './test/mock-navigation-location-service';
import { NavigationLocationService, NavigationLocationServiceConfiguration } from './navigation-location-service';

disableJSDOM();

// tslint:disable:no-unused-expression

describe('navigation-location-service', () => {

    let stack: NavigationLocationService;
    let configuration: NavigationLocationServiceConfiguration;

    before(() => {
        disableJSDOM = enableJSDOM();
    });

    after(() => {
        disableJSDOM();
    });

    beforeEach(() => {
        [stack, configuration] = init();
    });

    it('should not allow navigating back when the stack is empty', () => {
        expect(stack.canGoBack()).to.be.false;
    });

    it('should not allow navigating back when the stack has a single location', () => {
        stack.register(createCursorLocation());
        expect(stack.canGoBack()).to.be.false;
    });

    it('should allow navigating back when the stack has more than one locations', () => {
        stack.register(
            createCursorLocation(),
            createCursorLocation({ line: 100, character: 100 })
        );
        expect(stack.canGoBack()).to.be.true;
    });

    it('should not allow navigating forward when the stack is empty', () => {
        expect(stack.canGoFroward()).to.be.false;
    });

    it('should not allow navigating forward when the pointer points to the end last element of the stack', () => {
        stack.register(
            createCursorLocation(),
            createCursorLocation({ line: 100, character: 100 })
        );
        expect(stack.canGoFroward()).to.be.false;
    });

    it('should not exceed the max stack item', () => {
        const max = configuration.maxStackItems();
        stack.register(...[...Array(100).keys()].map(i => createCursorLocation({ line: i * 10, character: i }, `file://${i}`)));
        expect(stack.locations().length).to.be.equal(max);
    });

    function createCursorLocation(context: Position = { line: 0, character: 0, }, uri: string = 'file://path/to/file'): CursorLocation {
        return NavigationLocation.create(uri, NavigationLocation.Type.CURSOR, context);
    }

    function init(): [NavigationLocationService, NavigationLocationServiceConfiguration] {
        const container = new Container({ defaultScope: 'Singleton' });
        container.bind(NavigationLocationService).toSelf();
        container.bind(MockNavigationLocationServiceConfiguration).toSelf();
        container.bind(NavigationLocationServiceConfiguration).toService(MockNavigationLocationServiceConfiguration);
        container.bind(NavigationLocationSimilarity).toSelf();
        container.bind(MockOpenerService).toSelf();
        container.bind(MockLogger).toSelf();
        container.bind(ILogger).toService(MockLogger);
        container.bind(OpenerService).toService(MockOpenerService);
        return [
            container.get(NavigationLocationService),
            container.get(NavigationLocationServiceConfiguration),
        ];
    }

});
