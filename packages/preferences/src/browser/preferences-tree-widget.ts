/********************************************************************************
 * Copyright (C) 2018 Red Hat, Inc. and others.
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

import { inject } from "inversify";
import { Message } from "@phosphor/messaging";
import { PreferencesMenuFactory } from "./preferences-menu-factory";
import { PreferencesDecorator } from "./preferences-decorator";
import { toArray } from '@phosphor/algorithm';
import { DockPanel } from "@phosphor/widgets";
import {
    ContextMenuRenderer,
    ExpandableTreeNode,
    PreferenceSchemaProvider,
    SelectableTreeNode,
    PreferenceProperty,
    PreferenceScope,
    PreferenceService,
    TreeModel,
    TreeNode,
    TreeProps,
    TreeWidget,
    WidgetManager,
    Saveable,
    ApplicationShell
} from "@theia/core/lib/browser";
import { UserPreferenceProvider } from "./user-preference-provider";
import { WorkspacePreferenceProvider } from "./workspace-preference-provider";
import { EditorBasedSplitPanel, EditorWidget } from "@theia/editor/lib/browser";
import { DisposableCollection, Emitter, Event, MaybePromise, MessageService } from '@theia/core';
import { PREFERENCES_CONTAINER_WIDGET_ID, PREFERENCES_TREE_WIDGET_ID } from "./preferences-contribution";

let dirty = false;
let currentEditor: EditorWidget;
let preferencesScope: PreferenceScope;
const onDirtyChangedEmitter = new Emitter<void>();

export class PreferencesContainer extends EditorBasedSplitPanel implements Saveable {

    protected treeWidget: TreeWidget;

    get dirty(): boolean {
        return dirty;
    }
    autoSave: "on" | "off";
    save: () => MaybePromise<void>;
    onDirtyChanged: Event<void>;
    protected readonly toDispose = new DisposableCollection();

    constructor(protected readonly widgetManager: WidgetManager,
                protected readonly shell: ApplicationShell,
                protected readonly userPreferenceProvider: UserPreferenceProvider,
                protected readonly workspacePreferenceProvider: WorkspacePreferenceProvider) {
        super();

        this.id = PREFERENCES_CONTAINER_WIDGET_ID;
        this.title.label = "Preferences";
        this.title.closable = true;
        this.title.iconClass = 'fa fa-sliders';

        this.onDirtyChanged = onDirtyChangedEmitter.event;
        this.save = () => {
            toArray((<DockPanel>this.widgets.find(widget => widget instanceof DockPanel)).widgets())
                .forEach(widget => (<EditorWidget>widget).saveable.save());
        };
    }

    dispose(): void {
        if (this.isDisposed) {
            return;
        }
        super.dispose();
        this.toDispose.dispose();
    }

    getEditor(): EditorWidget {
        return currentEditor;
    }

    protected async onAfterAttach(msg: Message) {
        this.treeWidget = await this.widgetManager.getOrCreateWidget(PREFERENCES_TREE_WIDGET_ID) as TreeWidget;
        const editorsContainer = new PreferencesEditorsContainer(this.widgetManager, this.shell, this.userPreferenceProvider, this.workspacePreferenceProvider);
        this.addWidget(this.treeWidget);
        this.addWidget(editorsContainer);
        this.treeWidget.activate();
        super.onAfterAttach(msg);
    }

    protected onActivateRequest(msg: Message): void {
        this.treeWidget.activate();
        super.onActivateRequest(msg);
    }

    onCloseRequest(msg: Message) {
        dirty = false;
        this.widgets.forEach(widget => widget.close());
        super.onCloseRequest(msg);
        this.dispose();
    }
}

export class PreferencesEditorsContainer extends DockPanel {

    private userUri: string;
    private wsUri: string;

    constructor(protected readonly widgetManager: WidgetManager,
                protected readonly shell: ApplicationShell,
                protected readonly userPreferenceProvider: UserPreferenceProvider,
                protected readonly workspacePreferenceProvider: WorkspacePreferenceProvider) {
        super();
    }

    onCloseRequest(msg: Message) {
        toArray(this.widgets()).forEach(widget => widget.close());
        super.onCloseRequest(msg);
    }

    onUpdateRequest(msg: Message) {
        currentEditor = this.selectedWidgets().next() as EditorWidget;
        if (currentEditor && currentEditor.id.endsWith(this.userUri)) {
            preferencesScope = PreferenceScope.User;
        } else if (currentEditor && currentEditor.id.endsWith(this.wsUri)) {
            preferencesScope = PreferenceScope.Workspace;
        }

        const currentWidget = this.shell.currentWidget;
        this.shell.currentChanged.emit({
            oldValue: currentWidget ? currentWidget : null,
            newValue: currentEditor
        });

        super.onUpdateRequest(msg);
    }

    protected async onAfterAttach(msg: Message): Promise<void> {
        this.userUri = this.userPreferenceProvider.getUri().withoutFragment().toString();
        const wsUri = await this.workspacePreferenceProvider.getUri();
        if (wsUri) {
            this.wsUri = wsUri.toString();
        }

        const userPreferences = await await this.widgetManager.getOrCreateWidget(
            "code-editor-opener",
            this.userUri
        ) as EditorWidget;
        userPreferences.title.label = 'User Preferences';
        userPreferences.saveable.onDirtyChanged(() => {
            dirty = userPreferences.saveable.dirty;
            onDirtyChangedEmitter.fire(undefined);
        });
        this.addWidget(userPreferences);

        const workspacePreferences = await this.widgetManager.getOrCreateWidget("code-editor-opener", wsUri) as EditorWidget;
        workspacePreferences.title.label = 'Workspace Preferences';
        workspacePreferences.saveable.onDirtyChanged(() => {
            dirty = workspacePreferences.saveable.dirty;
            onDirtyChangedEmitter.fire(undefined);
        });
        this.addWidget(workspacePreferences);

        super.onAfterAttach(msg);
    }
}

export class PreferencesTreeWidget extends TreeWidget {

    private preferencesGroupNames: string[] = [];
    private readonly properties: { [name: string]: PreferenceProperty };

    @inject(PreferencesMenuFactory) protected readonly preferencesMenuFactory: PreferencesMenuFactory;
    @inject(PreferenceService) protected readonly preferenceService: PreferenceService;
    @inject(PreferencesDecorator) protected readonly decorator: PreferencesDecorator;
    @inject(MessageService) protected readonly messageService: MessageService;

    protected constructor(@inject(TreeModel) readonly model: TreeModel,
                          @inject(TreeProps) protected readonly treeProps: TreeProps,
                          @inject(ContextMenuRenderer) protected readonly contextMenuRenderer: ContextMenuRenderer,
                          @inject(PreferenceSchemaProvider) protected readonly preferenceSchemaProvider: PreferenceSchemaProvider) {
        super(treeProps, model, contextMenuRenderer);

        this.id = PREFERENCES_TREE_WIDGET_ID;

        this.properties = this.preferenceSchemaProvider.getCombinedSchema().properties;
        for (const property in this.properties) {
            if (property) {
                const group: string = property.substring(0, property.indexOf('.'));
                if (this.preferencesGroupNames.indexOf(group) < 0) {
                    this.preferencesGroupNames.push(group);
                }
            }
        }
    }

    protected onAfterAttach(msg: Message): void {
        this.initializeModel();
        super.onAfterAttach(msg);
    }

    protected handleContextMenuEvent(node: TreeNode | undefined, event: React.MouseEvent<HTMLElement>): void {
        super.handleContextMenuEvent(node, event);
        if ((<ExpandableTreeNode>node).expanded === undefined) {
            this.openContextMenu(node, event.nativeEvent.x, event.nativeEvent.y);
        }
    }

    protected handleClickEvent(node: TreeNode | undefined, event: React.MouseEvent<HTMLElement>): void {
        super.handleClickEvent(node, event);
        if ((<ExpandableTreeNode>node).expanded === undefined) {
            this.openContextMenu(node, event.nativeEvent.x, event.nativeEvent.y);
        }
    }

    protected handleEnter(event: KeyboardEvent): void {
        super.handleEnter(event);
        const node: TreeNode = this.model.selectedNodes[0];
        if ((<ExpandableTreeNode>node).expanded === undefined) {
            if (node) {
                const nodeElement = document.getElementById(node.id);
                if (nodeElement) {
                    const position = nodeElement.getBoundingClientRect();
                    this.openContextMenu(this.model.selectedNodes[0], position.left, position.bottom);
                }
            }
        }
    }

    private openContextMenu(node: TreeNode | undefined, positionX: number, positionY: number): void {
        if (node && SelectableTreeNode.is(node)) {
            const contextMenu = this.preferencesMenuFactory.createPreferenceContextMenu(
                node.id,
                this.preferenceService.get(node.id),
                this.properties[node.id],
                (property, value) => {
                    if (dirty) {
                        this.messageService.warn('Preferences editor(s) has/have unsaved changes');
                    } else {
                        this.preferenceService.set(property, value, preferencesScope);
                    }
                }
            );
            contextMenu.aboutToClose.connect(() => {
                this.activate();
            });
            contextMenu.activeItem = contextMenu.items[0];
            contextMenu.open(positionX, positionY);
        }
    }

    protected initializeModel(): void {
        type GroupNode = SelectableTreeNode & ExpandableTreeNode;
        const preferencesGroups: GroupNode [] = [];
        const root: ExpandableTreeNode = {
            id: 'root-node-id',
            name: 'Apply the preference to selected preferences file',
            parent: undefined,
            visible: true,
            children: preferencesGroups,
            expanded: true,
        };
        const nodes: { [id: string]: PreferenceProperty } [] = [];
        for (const group of this.preferencesGroupNames) {
            const propertyNodes: SelectableTreeNode[] = [];
            const properties: string[] = [];
            for (const property in this.properties) {
                if (property.startsWith(group)) {
                    properties.push(property);
                }
            }
            const preferencesGroup: GroupNode = {
                id: group + '-id',
                name: group.toLocaleUpperCase().substring(0, 1) + group.substring(1) + ' (' + properties.length + ')',
                visible: true,
                parent: root,
                children: propertyNodes,
                expanded: false,
                selected: false
            };
            properties.forEach(property => {
                const node: SelectableTreeNode = {
                    id: property,
                    name: property.substring(property.indexOf('.') + 1),
                    parent: preferencesGroup,
                    visible: true,
                    selected: false
                };
                propertyNodes.push(node);
                nodes.push({[property]: this.properties[property]});
            });
            preferencesGroups.push(preferencesGroup);
        }
        this.decorator.fireDidChangeDecorations(nodes);
        this.model.root = root;
    }
}
