/*
 * Copyright (C) 2017 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { injectable } from "inversify";
import URI from "@theia/core/lib/common/uri";
import { WidgetOpenHandler } from "@theia/core/lib/browser";
import {PreferencesWidget} from "./preferences-widget";
import {PREFERENCES_WIDGET_ID} from "./preferences-view-contribution";

@injectable()
export class PreferencesOpenHandler extends WidgetOpenHandler<PreferencesWidget> {

    readonly id = PREFERENCES_WIDGET_ID;

    canHandle(uri: URI): number {
        try {
            if (uri.scheme === 'preferences') {
                return 500;
            } else {
                return 0;
            }
        } catch {
            return 0;
        }
    }

}
