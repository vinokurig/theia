/*
 * Copyright (C) 2018 Ericsson and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { ContainerModule, interfaces, } from 'inversify';
import { PreferenceProvider, PreferenceScope } from "@theia/core/lib/browser/preferences";
import { UserPreferenceProvider } from './user-preference-provider';
import { WorkspacePreferenceProvider } from './workspace-preference-provider';
import { PreferencesFrontendContribution } from './preference-frontend-contribution';
import { MenuContribution, CommandContribution } from '@theia/core/lib/common';
import { PreferencesWidget } from "./preferences-widget";
import { OpenHandler, WidgetFactory } from "@theia/core/lib/browser";
import { PreferencesOpenHandler } from "./preferences-open-handler";
import { PREFERENCES_WIDGET_ID } from "./preference-frontend-contribution";
import { createPreferencesTreeWidget } from "./tree/preferences-tree-container";
import '../../src/browser/style/preferences.css';
import {PreferencesBrowserMainMenuFactory} from "./tree/preferences-menu-plugin";

export function bindPreferences(bind: interfaces.Bind, unbind: interfaces.Unbind): void {
    unbind(PreferenceProvider);

    bind(PreferenceProvider).to(UserPreferenceProvider).inSingletonScope().whenTargetNamed(PreferenceScope.User);
    bind(PreferenceProvider).to(WorkspacePreferenceProvider).inSingletonScope().whenTargetNamed(PreferenceScope.Workspace);

    bind(PreferencesFrontendContribution).toSelf().inSingletonScope();
    bind(CommandContribution).toService(PreferencesFrontendContribution);
    bind(MenuContribution).toService(PreferencesFrontendContribution);

    bind(PreferencesWidget).toSelf();
    bind(WidgetFactory).toDynamicValue(context => ({
        id: PREFERENCES_WIDGET_ID,
        createWidget: () => createPreferencesTreeWidget(context.container)
    })).inSingletonScope();

    bind(PreferencesOpenHandler).toSelf().inRequestScope();
    bind(OpenHandler).toDynamicValue(ctx => ctx.container.get(PreferencesOpenHandler)).inSingletonScope();
    bind(PreferencesBrowserMainMenuFactory).toSelf();

    // bind(PreferencesWidgetFactory).toSelf().inSingletonScope();
    // bind(WidgetFactory).toDynamicValue(ctx => ctx.container.get(PreferencesWidgetFactory)).inSingletonScope();
}

export default new ContainerModule((bind, unbind, isBound, rebind) => {
    bindPreferences(bind, unbind);
});
