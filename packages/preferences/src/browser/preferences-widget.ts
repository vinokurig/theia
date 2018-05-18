/*
 * Copyright (C) 2017 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { inject } from "inversify";
import { VirtualWidget } from "@theia/core/lib/browser/widgets/virtual-widget";
import { Message } from "@phosphor/messaging";
import { h } from '@phosphor/virtualdom';
import { EditorPreferences } from "@theia/editor/lib/browser/editor-preferences";
import { PreferenceService } from "../../../core/lib/browser/preferences";
import {GitPreferences} from "@theia/git/lib/browser/git-preferences";
import {EditorManager} from "@theia/editor/lib/browser";
import URI from "@theia/core/lib/common/uri";
import {ApplicationShell, PreferenceSchema, PreferenceScope} from "@theia/core/lib/browser";
import {PreferenceProperty} from "@theia/core/lib/browser/preferences/preference-contribution";

export interface PreferenceGroup {
    name: string;
    preferences: Preference[];
    isExpanded: boolean;
}

export interface Preference {
    name: string;
    property: PreferenceProperty;
}

export class PreferencesWidget extends VirtualWidget {
    private widget1: any;
    protected preferencesGroups: PreferenceGroup[];
    constructor (@inject(EditorPreferences) protected readonly editorPreferences: EditorPreferences,
                 @inject(GitPreferences) protected readonly gitPreferences: GitPreferences,
                 @inject(EditorManager) protected readonly editorManager: EditorManager,
                 @inject(PreferenceSchema) protected readonly preferenceSchema: PreferenceSchema,
                 @inject(ApplicationShell) protected readonly applicationShell: ApplicationShell,
                 @inject(PreferenceService) protected readonly preferenceService: PreferenceService) {
        super();
        this.id = "theia-preferences-container";
        this.title.label = 'Prefernces';
        this.title.closable = true;
        this.addClass('theia-preferences');
        this.preferencesGroups = [];

        const promise = this.editorManager.open(
            new URI()
                .withScheme("file")
                .withPath("/home/ivinokur/.theia/settings.json"), {
                mode: "activate",
                widgetOptions: {area: "right"}
            }
        );
        promise.then(widget => {
            this.widget1 = widget;
            this.update();
        });
        this.update();
    }

    protected onCloseRequest(msg: Message): void {
        if (this.widget1) {
            this.widget1.close();
        }
        this.applicationShell.collapsePanel("right");
        super.onCloseRequest(msg);
    }

    protected onActivateRequest(msg: Message): void {
        super.onActivateRequest(msg);
        const editorPreferences: Preference[] = [];
        const gitPreferences: Preference[] = [];
        const properties = this.preferenceSchema.properties;
        for (const propertie in properties) {
            if (propertie) {
                const value: PreferenceProperty = properties[propertie];
                editorPreferences.push({name: propertie, property: value});
            }
        }
        this.preferencesGroups.push({
            name: "Editor Preferences",
            preferences: editorPreferences,
            isExpanded: false
        });
        this.preferencesGroups.push({
            name: "Git Preferences",
            preferences: gitPreferences,
            isExpanded: false
        });
        this.update();
    }

    protected render(): h.Child {
        const preferenceGroups = [];
        for (const preferenceGroup of this.preferencesGroups) {
            preferenceGroups.push(this.renderPreferenceGroup(preferenceGroup));
        }
        return h.div({ className: "preferences-container" }, ...preferenceGroups);
    }

    protected renderPreferenceGroup(group: PreferenceGroup): h.Child {
        return h.div({
                className: "preference-group"
            },
            h.div({className: "toggle",
                    onclick: () => {
                        group.isExpanded = !group.isExpanded;
                        this.update();
                    }
                },
                h.div({className: "number"}, group.name),
                h.div({className: group.isExpanded ? "icon fa fa-caret-down" : "icon fa fa-caret-right"})
            ), group.isExpanded ? this.renderPreferencesList(group.preferences) : "");
    }

    protected renderPreferencesList(preferences: Preference[]): h.Child {
        const files: h.Child[] = [];
        for (const preference of preferences) {
            files.push(this.renderPreferenceItem(preference));
        }
        const commitFiles = h.div({ className: "preferences-list" }, ...files);
        return h.div({ className: "preference-body" }, commitFiles);
    }

    protected renderPreferenceItem(preference: Preference): h.Child {
        const nameSpan = h.span({className: 'preference-item-name', title: preference.property.description}, preference.name);
        const property = preference.property;
        const enumItems: h.Child[] = [];
        let value;
        if (property.type === 'boolean') {
            enumItems.push(h.span({
                className: 'preference-item-value-list-item', onclick: (event: MouseEvent) => {
                    this.handleElement(preference.name, "true", event.toElement.parentElement);
                }
            }, 'true'));
            enumItems.push(h.span({
                className: 'preference-item-value-list-item', onclick: (event: MouseEvent) => {
                    this.handleElement(preference.name, "false", event.toElement.parentElement);
                }
            }, 'false'));
        } else if (property.enum) {
            property.enum.forEach(item => {
                enumItems.push(h.span({
                    className: 'preference-item-value-list-item', onclick: (event: MouseEvent) => {
                        this.handleElement(preference.name, item, event.toElement.parentElement);
                    }
                }, item));
            });
        }
        if (enumItems.length !== 0) {
            value = h.div({className: 'preference-item-value-list'}, ...enumItems);
        } else {
            const buttonAdd = h.span({className: 'preference-item-value-add-button', onclick: (event: MouseEvent) => {
                    this.handleElement(preference.name, "some value", event.toElement.parentElement);
                }
            }, 'Add value');
            const defaultValue = property.default ? property.default : "";
            const input = h.input({className: 'preference-item-value-input', placeholder: defaultValue});
            value = h.div({className: 'preference-item-value-add', id: preference.name + "-id", tabindex: '0'}, input, buttonAdd);
        }
        const elements: h.Child[] = [];
        let previousContainer: HTMLElement;
        const editDiv = h.div({className: "preference-item-pencil-div"},
            h.div({
                className: 'preference-item-pencil-container',
                tabindex: '0',
                id: "pencil-container",
                onclick: () => {
                    if (previousContainer) {
                        previousContainer.style.display = "none";
                    }
                    const container = document.getElementById(preference.name + "-id");
                    if (container) {
                        previousContainer = container;
                        container.style.display = "block";
                    }
                }
            }, h.i({className: "icon fa fa-pencil", title: "Edit"})), value);
        // const editContainer = h.div({
        //         className: 'preference-item-value-add-container',
        //         tabindex: '0',
        //         id: "preference-item-value-add-container",
        //         onclick: () => {
        //             if (previousContainer) {
        //                 previousContainer.style.display = "none";
        //             }
        //             const container = document.getElementById(preference.name + "-id");
        //             if (container) {
        //                 previousContainer = container;
        //                 container.style.display = "block";
        //             }
        //         }
        //     }, value);
        elements.push(editDiv, nameSpan);
        return h.div({className: 'preference-item-container'}, ...elements);
    }

    protected handleElement(name: string, item: string, element: HTMLElement | null): void {
        this.preferenceService.set(name, item, PreferenceScope.User);
        let parent = element;
        if (parent) {
            parent = parent.parentElement;
            if (parent) {
                parent = parent.parentElement;
                if (parent) {
                    parent.blur();
                }
            }
        }
    }
}
