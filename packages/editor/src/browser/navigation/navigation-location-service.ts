/*
 * Copyright (C) 2018 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { inject, injectable } from 'inversify';
import { ILogger } from '@theia/core/lib/common/logger';
import { OpenerService, OpenerOptions, open } from '@theia/core/lib/browser/opener-service';
import { EditorOpenerOptions } from '../editor-manager';
import { NavigationLocationUpdater } from './navigation-location-updater';
import { NavigationLocationSimilarity } from './navigation-location-similarity';
import { ContentChangeLocation, CursorLocation, NavigationLocation, SelectionLocation, Position } from './navigation-location';

/**
 * Configuration object for the navigation location service.
 */
@injectable()
export class NavigationLocationServiceConfiguration {

    private static MAX_STACK_ITEMS = 30;

    /**
     * Returns with the number of navigation locations that the application can handle and manage.
     * When the number of locations exceeds this number, old locations will be erased.
     */
    maxStackItems(): number {
        return NavigationLocationServiceConfiguration.MAX_STACK_ITEMS;
    }

}

/**
 * The navigation location service. Also, stores and manages navigation locations.
 */
@injectable()
export class NavigationLocationService {

    @inject(ILogger)
    protected readonly logger: ILogger;

    @inject(OpenerService)
    protected readonly openerService: OpenerService;

    @inject(NavigationLocationUpdater)
    protected readonly updater: NavigationLocationUpdater;

    @inject(NavigationLocationSimilarity)
    protected readonly similarity: NavigationLocationSimilarity;

    @inject(NavigationLocationServiceConfiguration)
    protected readonly configuration: NavigationLocationServiceConfiguration;

    protected pointer = -1;
    protected stack: NavigationLocation[] = [];
    protected canRegister = true;

    /**
     * Registers the give locations into the service.
     */
    register(...locations: NavigationLocation[]): void {
        if (this.canRegister) {
            const max = this.configuration.maxStackItems();
            [...locations].forEach(location => {
                const current = this.currentLocation();
                if (!this.isSimilar(current, location)) {
                    // Just like in VSCode; if we are not at the end of stack, we remove anything after.
                    if (this.stack.length > this.pointer + 1) {
                        this.stack = this.stack.slice(0, this.pointer + 1);
                    }
                    this.stack.push(location);
                    this.pointer = this.stack.length - 1;
                    if (this.stack.length > max) {
                        this.stack.shift();
                        this.pointer--;
                    }
                }
            });
        }
    }

    /**
     * Navigates one back. Returns with the previous location, or `undefined` if the navigation failed.
     */
    async back(): Promise<NavigationLocation | undefined> {
        if (this.canGoBack()) {
            this.pointer--;
            await this.reveal();
            return this.currentLocation();
        }
        return undefined;
    }

    /**
     * Navigates one forward. Returns with the next location, or `undefined` if the navigation failed.
     */
    async forward(): Promise<NavigationLocation | undefined> {
        if (this.canGoFroward()) {
            this.pointer++;
            await this.reveal();
            return this.currentLocation();
        }
        return undefined;
    }

    /**
     * Checks whether the service can go [`back`](#back).
     */
    canGoBack(): boolean {
        return this.pointer >= 1;
    }

    /**
     * Checks whether the service can go [`forward`](#forward).
     */
    canGoFroward(): boolean {
        return this.pointer >= 0 && this.pointer !== this.stack.length - 1;
    }

    /**
     * Returns with all known navigation locations in chronological order.
     */
    locations(): ReadonlyArray<NavigationLocation> {
        return this.stack || [];
    }

    /**
     * Returns with the current location.
     */
    currentLocation(): NavigationLocation | undefined {
        return this.stack[this.pointer];
    }

    /**
     * `true` if the two locations are similar.
     */
    protected isSimilar(left: NavigationLocation | undefined, right: NavigationLocation | undefined): boolean {
        return this.similarity.similar(left, right);
    }

    /**
     * Reveals the location argument. If not given, reveals the `current location`. Does nothing, if the argument is `undefined`.
     */
    protected async reveal(location: NavigationLocation | undefined = this.currentLocation()): Promise<void> {
        if (location === undefined) {
            return;
        }
        try {
            this.canRegister = false;
            const { uri } = location;
            const options = this.toOpenerOptions(location);
            await open(this.openerService, uri, options);
        } catch (e) {
            this.logger.error(`Error occurred while revealing location: ${location}.`, e);
        } finally {
            this.canRegister = true;
        }
    }

    /**
     * Returns with the opener option for the location argument.
     */
    protected toOpenerOptions(location: NavigationLocation): OpenerOptions {
        const position = ((): Position | undefined => {
            if (location === undefined) {
                return undefined;
            }
            if (CursorLocation.is(location)) {
                return location.context;
            }
            if (SelectionLocation.is(location)) {
                return location.context.start;
            }
            if (ContentChangeLocation.is(location)) {
                if (location.context.length === 0) {
                    return undefined;
                }
                return location.context[0].range.start;
            }
            throw new Error(`Unexpected navigation location: ${location}.`);
        })();
        if (position === undefined) {
            return {};
        }
        return {
            selection: CursorLocation.toRange(position)
        } as EditorOpenerOptions;
    }

}
