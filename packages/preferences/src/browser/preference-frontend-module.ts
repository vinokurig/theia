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
import { PreferencesWidget } from "./preferences-widget";
import { bindViewContribution, OpenHandler, WidgetFactory } from "@theia/core/lib/browser";
import {
    PREFERENCES_WIDGET_ID,
    PreferencesViewContribution
} from "./preferences-view-contribution";

import '../../src/browser/style/prefernces.css';
import { PreferencesOpenHandler } from "@theia/preferences/lib/browser/preferences-open-handler";

export function bindPreferences(bind: interfaces.Bind, unbind: interfaces.Unbind): void {
    unbind(PreferenceProvider);

    bind(PreferenceProvider).to(UserPreferenceProvider).inSingletonScope().whenTargetNamed(PreferenceScope.User);
    bind(PreferenceProvider).to(WorkspacePreferenceProvider).inSingletonScope().whenTargetNamed(PreferenceScope.Workspace);

    bind(PreferencesOpenHandler).toSelf();
    bind(OpenHandler).toDynamicValue(ctx => ctx.container.get(PreferencesOpenHandler));
    bindViewContribution(bind, PreferencesViewContribution);
    bind(PreferencesWidget).toSelf();
    bind(WidgetFactory).toDynamicValue(context => ({
        id: PREFERENCES_WIDGET_ID,
        createWidget: () => context.container.get<PreferencesWidget>(PreferencesWidget)
    })).inSingletonScope();
}

export default new ContainerModule((bind, unbind, isBound, rebind) => {
    bindPreferences(bind, unbind);
});
