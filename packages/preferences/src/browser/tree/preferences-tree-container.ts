/*
 * Copyright (C) 2018 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { interfaces, Container } from 'inversify';
import { createTreeContainer, Tree, TreeImpl, TreeModel, TreeModelImpl, TreeWidget } from "@theia/core/lib/browser";
import {PreferencesTree} from "../tree/preferences-tree";
import {PreferencesTreeModel} from "../tree/preferences-tree-model";
import {PreferencesWidget} from "../preferences-widget";

function createPreferencesTreeContainer(parent: interfaces.Container): Container {
    const child = createTreeContainer(parent);

    child.unbind(TreeImpl);
    child.bind(PreferencesTree).toSelf();
    child.rebind(Tree).toDynamicValue(ctx => ctx.container.get(PreferencesTree));

    child.unbind(TreeModelImpl);
    child.bind(PreferencesTreeModel).toSelf();
    child.rebind(TreeModel).toDynamicValue(ctx => ctx.container.get(PreferencesTreeModel));

    child.bind(PreferencesWidget).toSelf();
    child.rebind(TreeWidget).toDynamicValue(ctx => ctx.container.get(PreferencesWidget));

    return child;
}

export function createPreferencesTreeWidget(parent: interfaces.Container): PreferencesWidget {
    return createPreferencesTreeContainer(parent).get<PreferencesWidget>(PreferencesWidget);
}
