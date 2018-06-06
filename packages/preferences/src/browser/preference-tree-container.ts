/*
 * Copyright (C) 2018 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { interfaces, Container } from 'inversify';
import { createTreeContainer, TreeWidget } from "../../../core/src/browser/index";
import { UserPreferencesWidget, WorkspacePreferencesWidget } from "./preferences-widget";

function createUserPreferencesTreeContainer(parent: interfaces.Container): Container {
    const child = createTreeContainer(parent);

    child.bind(UserPreferencesWidget).toSelf();
    child.rebind(TreeWidget).toDynamicValue(ctx => ctx.container.get(UserPreferencesWidget));

    return child;
}

export function createUserPreferencesTreeWidget(parent: interfaces.Container): UserPreferencesWidget {
    return createUserPreferencesTreeContainer(parent).get<UserPreferencesWidget>(UserPreferencesWidget);
}

function createWorkspacePreferencesTreeContainer(parent: interfaces.Container): Container {
    const child = createTreeContainer(parent);

    child.bind(WorkspacePreferencesWidget).toSelf();
    child.rebind(TreeWidget).toDynamicValue(ctx => ctx.container.get(WorkspacePreferencesWidget));

    return child;
}

export function createWorkspacePreferencesTreeWidget(parent: interfaces.Container): WorkspacePreferencesWidget {
    return createWorkspacePreferencesTreeContainer(parent).get<WorkspacePreferencesWidget>(WorkspacePreferencesWidget);
}
