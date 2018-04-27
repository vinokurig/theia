/*
 * Copyright (C) 2017 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { injectable } from "inversify";
import { WidgetOpenHandler } from "@theia/core/lib/browser";
import { PreferencesWidget } from "./preferences-widget";
import { PREFERENCES_WIDGET_ID } from "./preferences-view-contribution";
import URI from "@theia/core/lib/common/uri";

@injectable()
export class PreferencesOpenHandler extends WidgetOpenHandler<PreferencesWidget> {
    // readonly iconClass: string;
    readonly id: string = PREFERENCES_WIDGET_ID;

    canHandle(uri: URI): number {
        return 500;
    }
}
