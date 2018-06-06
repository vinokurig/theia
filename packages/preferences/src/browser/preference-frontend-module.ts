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
import { MenuContribution, CommandContribution } from '@theia/core/lib/common';
import { UserPreferencesWidget, WorkspacePreferencesWidget } from "./preferences-widget";
import { WidgetFactory } from "@theia/core/lib/browser";
import {
    UserPreferencesFrontendContribution,
    USER_PREFERENCES_WIDGET_ID,
    WORKSPACE_PREFERENCES_WIDGET_ID, WorkspacePreferencesFrontendContribution
} from "./preference-frontend-contribution";
import {createUserPreferencesTreeWidget, createWorkspacePreferencesTreeWidget} from "./tree/preferences-tree-container";
import { PreferencesBrowserMainMenuFactory } from "./tree/preferences-menu-plugin";

export function bindPreferences(bind: interfaces.Bind, unbind: interfaces.Unbind): void {
    unbind(PreferenceProvider);

    bind(PreferenceProvider).to(UserPreferenceProvider).inSingletonScope().whenTargetNamed(PreferenceScope.User);
    bind(PreferenceProvider).to(WorkspacePreferenceProvider).inSingletonScope().whenTargetNamed(PreferenceScope.Workspace);

    bind(UserPreferencesFrontendContribution).toSelf().inSingletonScope();
    bind(CommandContribution).toService(UserPreferencesFrontendContribution);
    bind(MenuContribution).toService(UserPreferencesFrontendContribution);

    bind(WorkspacePreferencesFrontendContribution).toSelf().inSingletonScope();
    bind(CommandContribution).toService(WorkspacePreferencesFrontendContribution);
    bind(MenuContribution).toService(WorkspacePreferencesFrontendContribution);

    bind(UserPreferencesWidget).toSelf();
    bind(WidgetFactory).toDynamicValue(context => ({
        id: USER_PREFERENCES_WIDGET_ID,
        createWidget: () => createUserPreferencesTreeWidget(context.container)
    })).inSingletonScope();

    bind(WorkspacePreferencesWidget).toSelf();
    bind(WidgetFactory).toDynamicValue(context => ({
        id: WORKSPACE_PREFERENCES_WIDGET_ID,
        createWidget: () => createWorkspacePreferencesTreeWidget(context.container)
    })).inSingletonScope();

    bind(PreferencesBrowserMainMenuFactory).toSelf();
}

export default new ContainerModule((bind, unbind, isBound, rebind) => {
    bindPreferences(bind, unbind);
});
