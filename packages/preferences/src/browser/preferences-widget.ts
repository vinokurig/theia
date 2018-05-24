/*
 * Copyright (C) 2017 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import {inject, multiInject} from "inversify";
import { VirtualWidget } from "@theia/core/lib/browser/widgets/virtual-widget";
import { Message } from "@phosphor/messaging";
import { EditorPreferences } from "@theia/editor/lib/browser/editor-preferences";
import { PreferenceService } from "../../../core/lib/browser/preferences";
import { GitPreferences } from "@theia/git/lib/browser/git-preferences";
import { EditorManager } from "@theia/editor/lib/browser";
import { ApplicationShell, PreferenceSchema, PreferenceScope } from "@theia/core/lib/browser";
import { PreferenceProperty } from "@theia/core/lib/browser/preferences/preference-contribution";
import { h, VirtualElement } from '@phosphor/virtualdom';

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

    scope: PreferenceScope;
    protected preferencesGroups: PreferenceGroup[];
    protected oldPreferenceName: string;

    constructor (@inject(EditorPreferences) protected readonly editorPreferences: EditorPreferences,
                 @inject(GitPreferences) protected readonly gitPreferences: GitPreferences,
                 @inject(EditorManager) protected readonly editorManager: EditorManager,
                 @multiInject(PreferenceSchema) protected readonly preferenceSchema: PreferenceSchema[],
                 @inject(ApplicationShell) protected readonly applicationShell: ApplicationShell,
                 @inject(PreferenceService) protected readonly preferenceService: PreferenceService) {
        super();
        this.addClass('theia-preferences');
        this.preferencesGroups = [];

        preferenceService.onPreferenceChanged(() => {
            this.update();
        });

        for (const group of this.preferenceSchema) {
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

    protected onActivateRequest(msg: Message): void {
        super.onActivateRequest(msg);
        this.node.focus();
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
        super.onCloseRequest(msg);
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
        const preferenceName: string = preference.name;
        const nameSpan = h.span({
            className: this.preferenceService.get(preferenceName) ? 'preference-item-name-saved' : 'preference-item-name-unsaved',
            title: preference.property.description
        }, preferenceName);
        const property = preference.property;
        const enumItems: h.Child[] = [];
        let valueContainer;
        if (property.type === 'boolean') {
            enumItems.push(this.createEnumItem(preferenceName, 'true'));
            enumItems.push(this.createEnumItem(preferenceName, 'false'));
        } else if (property.enum) {
            property.enum.forEach(item => {
                enumItems.push(this.createEnumItem(preferenceName, item));
            });
        }
        if (enumItems.length !== 0) {
            valueContainer = h.div({className: 'preference-item-value-list'}, ...enumItems);
        } else {
            const defaultValue = property.default ? property.default : "";
            const inputElement = h.input({
                className: 'preference-item-value-input-input',
                placeholder: defaultValue,
                type: property.type ? property.type.toString() : "string",
                id: 'value-input-' + preferenceName
            });
            const buttonAdd = h.button({
                className: 'preference-item-value-input-button',
                id: preferenceName + '-value-input-button',
                onclick: () => {
                    const inputValue: any = document.getElementById('value-input-' + preferenceName);
                    if (inputValue) {
                        const value: string = inputValue.value;
                        this.handleElement(preferenceName, value.length === 0 ? defaultValue : value);
                    }
                }
            });
            valueContainer = h.div({
                className: 'preference-item-value-input-div',
                id: 'value-input-id-' + preferenceName, tabindex: '0'}, inputElement, buttonAdd);
        }
        const elements: h.Child[] = [];
        const editDiv = h.div({className: "preference-item-pencil-div"},
            h.div({
                className: 'preference-item-pencil-icon-container',
                id: 'pencil-icon-container-' + preferenceName,
                tabindex: '0',
                onclick: () => {
                    if (this.oldPreferenceName) {
                        this.hideValue(this.oldPreferenceName);
                    }
                    this.oldPreferenceName = preferenceName;
                    const button = document.getElementById(preferenceName + '-value-input-button');
                    if (button) {
                        button.innerHTML = this.preferenceService.get(preferenceName) ? 'Edit' : 'Add Value';
                    }
                    const valueDiv = document.getElementById('value-container-' + preferenceName);
                    if (valueDiv) {
                        valueDiv.style.display = "block";
                    }
                    const iconDiv = document.getElementById('pencil-icon-container-' + preferenceName);
                    if (iconDiv) {
                        iconDiv.style.display = "block";
                    }
                }
            }, h.i({className: "icon fa fa-pencil", title: this.preferenceService.get(preferenceName) ? 'Edit' : 'Add Value'})), h.div({
                className: 'preference-item-value-div',
                id: 'value-container-' + preferenceName
            }, valueContainer));
        elements.push(editDiv, nameSpan);
        return h.div({className: 'preference-item-container'}, ...elements);
    }

    protected createEnumItem(preferenceName: string, value: string): VirtualElement {
        return h.span({
            className: 'preference-item-value-list-item', onclick: () => {
                this.handleElement(preferenceName, value);
            }
        }, value);
    }

    protected handleElement(preferenceName: string, value: string): void {
        this.preferenceService.set(preferenceName, value, this.scope);
        this.hideValue(preferenceName);
    }

    private hideValue(preferenceName: string): void {
        const valueDiv = document.getElementById('value-container-' + preferenceName);
        if (valueDiv) {
            valueDiv.style.display = 'none';
        }
        const iconDiv = document.getElementById('pencil-icon-container-' + preferenceName);
        if (iconDiv) {
            iconDiv.style.display = "none";
            iconDiv.removeAttribute('style');
        }
    }
}
