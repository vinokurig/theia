/*
 * Copyright (C) 2018 Red Hat, Inc. and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { inject } from "inversify";
import { Message } from "@phosphor/messaging";
import { EditorPreferences } from "@theia/editor/lib/browser/editor-preferences";
import { PreferenceService } from "../../../core/lib/browser/preferences";
import { EditorManager } from "@theia/editor/lib/browser";
import {
    ApplicationShell, ContextMenuRenderer, ExpandableTreeNode,
    PreferenceSchemaProvider,
    PreferenceScope, TreeNode,
    TreeProps,
    TreeWidget
} from "@theia/core/lib/browser";
import { PreferenceProperty } from "@theia/core/lib/browser/preferences/preference-contribution";
import { PreferencesTreeModel } from "./tree/preferences-tree-model";
import {SelectableTreeNode} from "@theia/core/lib/browser/tree/tree-selection";
import { DynamicMenuWidget} from "@theia/core/lib/browser/menu/browser-menu-plugin";
import { Menu as MenuWidget } from "@phosphor/widgets";
import {CompositeMenuNode} from "@theia/core";
import { CommandRegistry as PhosphorCommandRegistry } from "@phosphor/commands";

export interface PreferenceGroup {
    name: string;
    preferences: Preference[];
    isExpanded: boolean;
}

export interface Preference {
    name: string;
    property: PreferenceProperty;
}

export class PreferencesWidget extends TreeWidget {

    scope: PreferenceScope;
    protected preferencesGroups: PreferenceGroup[];

    constructor(@inject(EditorPreferences) protected readonly editorPreferences: EditorPreferences,
                @inject(EditorManager) protected readonly editorManager: EditorManager,
                @inject(PreferenceSchemaProvider) protected readonly preferenceSchemaProvider: PreferenceSchemaProvider,
                @inject(ApplicationShell) protected readonly applicationShell: ApplicationShell,
                @inject(PreferenceService) protected readonly preferenceService: PreferenceService,
                @inject(PreferencesTreeModel) readonly model: PreferencesTreeModel,
                @inject(TreeProps) protected readonly treeProps: TreeProps,
                @inject(ContextMenuRenderer) protected readonly contextMenuRenderer: ContextMenuRenderer) {
        super(treeProps, model, contextMenuRenderer);
        this.addClass('theia-preferences');
        this.preferencesGroups = [];

        this.id = "theia-preferences-container";
        this.title.label = 'Preferences';
        this.title.closable = true;
        this.title.iconClass = 'fa fa-sliders';

        preferenceService.onPreferenceChanged(() => {
            this.update();
        });

        for (const group of this.preferenceSchemaProvider.getSchemas()) {
            const properties = group.properties;
            const preferencesArray: Preference[] = [];
            for (const property in properties) {
                if (property) {
                    const value: PreferenceProperty = properties[property];
                    preferencesArray.push({name: property, property: value});
                }
            }
            this.preferencesGroups.push({
                name: group.name.toString(),
                preferences: preferencesArray,
                isExpanded: false
            });
        }

        this.update();
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
        const contextMenu = this.createContextMenu();
        const { x, y } = event instanceof MouseEvent ? { x: event.clientX, y: event.clientY } : event;
        contextMenu.open(x, y);
    }

    createContextMenu(): MenuWidget {
        const menuModel: CompositeMenuNode = new CompositeMenuNode('id');
        menuModel.addNode(new CompositeMenuNode('1'));
        const phosphorCommands = this.createPhosporCommands(menuModel);

        const contextMenu = new DynamicMenuWidget(menuModel, { commands: phosphorCommands });
        return contextMenu;
    }

    protected createPhosporCommands(menu: CompositeMenuNode): PhosphorCommandRegistry {
        const commands = new PhosphorCommandRegistry();
        this.addPhosphorCommands(commands, menu);
        return commands;
    }

    initializeModel(): void {
        const preferencesGroups: ExpandableTreeNode[] = [];
        const root: ExpandableTreeNode = {id: 'id1', name: 'root', parent: undefined,  visible: true, children: preferencesGroups, expanded: false};
        for (const group of this.preferenceSchemaProvider.getSchemas()) {
            const properties = group.properties;
            const propertyNodes: SelectableTreeNode[] = [];
            const preferencesGroup: ExpandableTreeNode = {
                id: group.name,
                name: group.name,
                visible: true,
                parent: root,
                children: propertyNodes,
                expanded: true
            };
            for (const property in properties) {
                if (property) {
                    const node: SelectableTreeNode = {id: property, name: property, parent: preferencesGroup, visible: true, selected: false};
                    propertyNodes.push(node);
                }
            }
            preferencesGroups.push(preferencesGroup);
        }
        this.model.root = root;
    }
}
