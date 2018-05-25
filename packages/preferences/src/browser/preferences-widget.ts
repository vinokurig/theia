/*
 * Copyright (C) 2017 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { inject, multiInject } from "inversify";
import { VirtualWidget } from "@theia/core/lib/browser/widgets/virtual-widget";
import { Message } from "@phosphor/messaging";
import { EditorPreferences } from "@theia/editor/lib/browser/editor-preferences";
import { PreferenceService } from "../../../core/lib/browser/preferences";
import { EditorManager } from "@theia/editor/lib/browser";
import { ApplicationShell, PreferenceSchema, PreferenceScope } from "@theia/core/lib/browser";
import { PreferenceProperty } from "@theia/core/lib/browser/preferences/preference-contribution";
import { h } from '@phosphor/virtualdom';

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

    constructor(@inject(EditorPreferences) protected readonly editorPreferences: EditorPreferences,
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
        return h.div({className: "preferences-container"}, ...preferenceGroups);
    }

    protected renderPreferenceGroup(group: PreferenceGroup): h.Child {
        return h.div(
            {className: "preference-group"},
            h.div(
                {
                    className: "preference-group-header-div",
                    onclick: () => {
                        group.isExpanded = !group.isExpanded;
                        this.update();
                    }
                },
                group.name,
                h.div({className: group.isExpanded ? "icon fa fa-caret-down" : "icon fa fa-caret-right"})
            ),
            group.isExpanded ? this.createPreferencesList(group.preferences) : ""
        );
    }

    protected createPreferencesList(preferences: Preference[]): h.Child {
        const preferenceItems: h.Child[] = [];
        preferences.forEach( preference => {
            preferenceItems.push(this.createPreferenceItem(preference));
        });
        return h.div({className: "preferences-list"}, ...preferenceItems);
    }

    protected createPreferenceItem(preference: Preference): h.Child {
        const preferenceName: string = preference.name;
        const nameSpan = h.span(
            {
                className: this.preferenceService.get(preferenceName) ? 'preference-item-name-saved' : 'preference-item-name-unsaved',
                title: preference.property.description
            },
            preferenceName);
        const property = preference.property;
        const onBlur = function(event: FocusEvent): void  {
            const relatedTarget: any = event.relatedTarget;
            if (relatedTarget && relatedTarget.className.startsWith('preference-item-value-')) {
                return;
            }
            PreferencesWidget.hideElement(preferenceName);
        };
        let valueContainer: h.Child;
        if (property.type === 'boolean' || property.enum) {
            valueContainer = this.createEnumItems(preferenceName, property);
        } else {
            valueContainer = this.createInputValuePanel(preferenceName, property, onBlur);
        }
        const editDiv = this.createEditDiv(preferenceName, property, onBlur, valueContainer);
        return h.div({className: 'preference-item-div'}, editDiv, nameSpan);
    }

    protected createEditDiv(preferenceName: string, property: PreferenceProperty, onBlur: (event: FocusEvent) => void, valueContainer: h.Child): h.Child {
        return h.div(
            {
                className: "preference-item-edit-div"
            },
            h.div(
                {
                    className: 'preference-item-edit-icon-div',
                    id: 'pencil-icon-container-' + preferenceName,
                    tabindex: '0',
                    onblur: onBlur,
                    onclick: () => {
                        this.update();
                        const valueDiv = document.getElementById('value-container-' + preferenceName);
                        if (valueDiv) {
                            valueDiv.style.display = "block";
                        }
                        const iconDiv = document.getElementById('pencil-icon-container-' + preferenceName);
                        if (iconDiv) {
                            iconDiv.style.display = "block";
                        }
                    }
                },
                h.i(
                    {
                        className: "icon fa fa-pencil",
                        title: this.preferenceService.get(preferenceName) ? 'Edit' : 'Add Value'
                    }
                )
            ),
            h.div(
                {
                    className: 'preference-item-edit-container-div',
                    id: 'value-container-' + preferenceName,
                },
                valueContainer)
        );
    }

    protected createEnumItems(preferenceName: string, property: PreferenceProperty): h.Child {
        const enumItems: h.Child[] = [];
        if (property.type === 'boolean') {
            enumItems.push(this.createEnumItem(preferenceName, 'true'));
            enumItems.push(this.createEnumItem(preferenceName, 'false'));
        } else if (property.enum) {
            property.enum.forEach(item => {
                enumItems.push(this.createEnumItem(preferenceName, item));
            });
        }
        return h.div({className: 'preference-item-value-select-container-span'}, ...enumItems);
    }

    protected createEnumItem(preferenceName: string, value: string): h.Child {
        return h.span(
            {
                className: 'preference-item-value-select-span',
                tabindex: '0',
                onclick: () => {
                    this.preferenceService.set(preferenceName, value, this.scope);
                    PreferencesWidget.hideElement(preferenceName);
                }
            },
            value
        );
    }

    protected createInputValuePanel(preferenceName: string, property: PreferenceProperty, onBlur: (event: FocusEvent) => void): h.Child {
        const defaultValue = property.default ? property.default : "";
        const buttonElement = h.button(
            {
                className: 'preference-item-value-input-button',
                id: preferenceName + '-value-input-button',
                onclick: () => {
                    const inputValue: any = document.getElementById('value-input-' + preferenceName);
                    if (inputValue) {
                        const value: string = inputValue.value;
                        this.preferenceService.set(preferenceName, value.length === 0 ? defaultValue : value, this.scope);
                        PreferencesWidget.hideElement(preferenceName);
                    }
                }
            },
            this.preferenceService.get(preferenceName) ? 'Edit' : 'Add Value'
        );
        const inputElement = h.input(
            {
                className: 'preference-item-value-input-input',
                placeholder: defaultValue,
                type: property.type ? property.type.toString() : "string",
                id: 'value-input-' + preferenceName,
                onblur: onBlur
            }
        );
        return h.div(
            {
                className: 'preference-item-value-input-div',
                id: 'value-input-id-' + preferenceName,
                tabindex: '0',
                onblur: onBlur
            },
            inputElement,
            buttonElement
        );
    }

    private static hideElement(preferenceName: string): void {
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
