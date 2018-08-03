/********************************************************************************
 * Copyright (C) 2018 Ericsson and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

import { ContainerModule, interfaces, } from 'inversify';
import { PreferenceProvider, PreferenceScope } from '@theia/core/lib/browser/preferences';
import { UserPreferenceProvider } from './user-preference-provider';
import { WorkspacePreferenceProvider } from './workspace-preference-provider';
import { bindViewContribution, WidgetFactory } from '@theia/core/lib/browser';
import {
    PreferencesContribution,
    PREFERENCES_TREE_WIDGET_ID
} from './preferences-contribution';
import { createPreferencesTreeWidget } from './preference-tree-container';
import { PreferencesMenuFactory } from './preferences-menu-factory';
import { PreferencesWidgetFactory } from './preferences-widget-factory';

export function bindPreferences(bind: interfaces.Bind, unbind: interfaces.Unbind): void {
    unbind(PreferenceProvider);

    bind(PreferenceProvider).to(UserPreferenceProvider).inSingletonScope().whenTargetNamed(PreferenceScope.User);
    bind(PreferenceProvider).to(WorkspacePreferenceProvider).inSingletonScope().whenTargetNamed(PreferenceScope.Workspace);

    bindViewContribution(bind, PreferencesContribution);

    bind(PreferencesWidgetFactory).toSelf().inSingletonScope();
    bind(WidgetFactory).toDynamicValue(ctx => ctx.container.get(PreferencesWidgetFactory)).inSingletonScope();

    bind(WidgetFactory).toDynamicValue(context => ({
        id: PREFERENCES_TREE_WIDGET_ID,
        createWidget: () => createPreferencesTreeWidget(context.container)
    })).inSingletonScope();

    bind(PreferencesMenuFactory).toSelf();
}

export default new ContainerModule((bind, unbind, isBound, rebind) => {
    bindPreferences(bind, unbind);
});
