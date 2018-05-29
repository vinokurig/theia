/*
 * Copyright (C) 2018 Red Hat, Inc. and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { injectable, inject } from "inversify";
import { FrontendApplication, PreferenceScope, WidgetFactory } from "@theia/core/lib/browser";
import { PreferencesWidget } from "./preferences-widget";
import { PREFERENCES_WIDGET_ID } from "./preference-frontend-contribution";

export class PreferencesWidgetOptions {
    readonly scope: PreferenceScope;
}

@injectable()
export class PreferencesWidgetFactory implements WidgetFactory {

    readonly id = PREFERENCES_WIDGET_ID;

    @inject(FrontendApplication) protected readonly app: FrontendApplication;
    @inject(PreferencesWidget) protected readonly widget: PreferencesWidget;

    async createWidget(options: PreferencesWidgetOptions): Promise<PreferencesWidget> {
        const widget = this.widget;
        widget.scope = options.scope;
        widget.id = "theia-preferences-container";
        widget.title.label = 'Prefernces';
        widget.title.closable = true;
        widget.title.iconClass = 'fa fa-sliders';
        return widget;
    }
}
