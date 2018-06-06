/*
 * Copyright (C) 2018 Red Hat, Inc. and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { inject } from "inversify";
import { Message } from "@phosphor/messaging";
import {
    ApplicationShell, ContextMenuRenderer, ExpandableTreeNode,
    PreferenceSchemaProvider,
    PreferenceScope, PreferenceService, TreeModel, TreeNode,
    TreeProps,
    TreeWidget
} from "@theia/core/lib/browser";
import { SelectableTreeNode } from "@theia/core/lib/browser/tree/tree-selection";
import { PreferencesBrowserMainMenuFactory } from "./preference-browser-main-menu-factory";

export abstract class PreferencesTreeWidget extends TreeWidget {

    abstract handlePropertySelection: (property: string, value: any) => void;

    protected preferencesGroupNames: string[] = [];

    @inject(PreferencesBrowserMainMenuFactory) protected readonly  preferencesMenuFactory: PreferencesBrowserMainMenuFactory;
    @inject(ApplicationShell) protected readonly applicationShell: ApplicationShell;
    @inject(PreferenceService) protected readonly preferenceService: PreferenceService;

    constructor(@inject(TreeModel) readonly model: TreeModel,
                @inject(TreeProps) protected readonly treeProps: TreeProps,
                @inject(ContextMenuRenderer) protected readonly contextMenuRenderer: ContextMenuRenderer,
                @inject(PreferenceSchemaProvider) protected readonly preferenceSchemaProvider: PreferenceSchemaProvider) {
        super(treeProps, model, contextMenuRenderer);
        this.addClass('theia-preferences');

        this.id = "theia-preferences-container";
        this.title.label = this instanceof UserPreferencesTreeWidget ? 'User Preferences' : 'Workspace Preferences';
        this.title.closable = true;
        this.title.iconClass = 'fa fa-sliders';

        const properties = this.preferenceSchemaProvider.getCombinedSchema().properties;
            for (const property in properties) {
                if (property) {
                    const group: string = property.substring(0, property.indexOf('.'));
                    if (this.preferencesGroupNames.indexOf(group) < 0) {
                        this.preferencesGroupNames.push(group);
                    }
                }
            }
    }

    protected onCloseRequest(msg: Message): void {
        this.applicationShell
            .getWidgets("right")
            .forEach(widget => {
                if (widget.id.endsWith('settings.json')) {
                    widget.close();
                }
            });
        this.applicationShell.collapsePanel("right");
        super.onCloseRequest(msg);
    }

    protected handleContextMenuEvent(node: TreeNode | undefined, event: MouseEvent): void {
        if (node && SelectableTreeNode.is(node)) {
            const contextMenu = this.preferencesMenuFactory.createPreferenceContextMenu(node.id,
                this.preferenceSchemaProvider.getCombinedSchema().properties[node.id],
                this.handlePropertySelection);
            const { x, y } = event instanceof MouseEvent ? { x: event.clientX, y: event.clientY } : event;
            contextMenu.open(x, y);
        }
        event.stopPropagation();
        event.preventDefault();
    }

    initializeModel(): void {
        const properties = this.preferenceSchemaProvider.getCombinedSchema().properties;
        const preferencesGroups: ExpandableTreeNode[] = [];
        const root: ExpandableTreeNode = {id: 'root-node-id', name: 'preferences', parent: undefined,  visible: true, children: preferencesGroups, expanded: true};

        for (const group of this.preferencesGroupNames) {
            const propertyNodes: SelectableTreeNode[] = [];
                const preferencesGroup: ExpandableTreeNode = {
                    id: group + '-id',
                    name: group,
                    visible: true,
                    parent: root,
                    children: propertyNodes,
                    expanded: false
                };
            for (const property in properties) {
                if (property.startsWith(group)) {
                    const node: SelectableTreeNode = {
                        id: property,
                        name: property.substring(property.indexOf('.') + 1),
                        parent: preferencesGroup,
                        visible: true,
                        selected: false
                    };
                    propertyNodes.push(node);
                }
            }
            preferencesGroups.push(preferencesGroup);
        }

        this.model.root = root;
    }
}

export class UserPreferencesTreeWidget extends PreferencesTreeWidget {
    handlePropertySelection = (property: string, value: any) => {
        this.preferenceService.set(property, value, PreferenceScope.User);
    }
}

export class WorkspacePreferencesTreeWidget extends PreferencesTreeWidget {
    handlePropertySelection = (property: string, value: any) => {
        this.preferenceService.set(property, value, PreferenceScope.Workspace);
    }
}
