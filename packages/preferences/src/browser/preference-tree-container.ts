/*
 * Copyright (C) 2018 Red Hat, Inc. and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { interfaces, Container } from 'inversify';
import { UserPreferencesTreeWidget, WorkspacePreferencesTreeWidget } from "./preferences-widget";
import { createTreeContainer, TreeWidget } from "@theia/core/lib/browser";

function createUserPreferencesTreeContainer(parent: interfaces.Container): Container {
    const child = createTreeContainer(parent);

    child.bind(UserPreferencesTreeWidget).toSelf();
    child.rebind(TreeWidget).toDynamicValue(ctx => ctx.container.get(UserPreferencesTreeWidget));

    return child;
}

export function createUserPreferencesTreeWidget(parent: interfaces.Container): UserPreferencesTreeWidget {
    return createUserPreferencesTreeContainer(parent).get<UserPreferencesTreeWidget>(UserPreferencesTreeWidget);
}

function createWorkspacePreferencesTreeContainer(parent: interfaces.Container): Container {
    const child = createTreeContainer(parent);

    child.bind(WorkspacePreferencesTreeWidget).toSelf();
    child.rebind(TreeWidget).toDynamicValue(ctx => ctx.container.get(WorkspacePreferencesTreeWidget));

    return child;
}

export function createWorkspacePreferencesTreeWidget(parent: interfaces.Container): WorkspacePreferencesTreeWidget {
    return createWorkspacePreferencesTreeContainer(parent).get<WorkspacePreferencesTreeWidget>(WorkspacePreferencesTreeWidget);
}
