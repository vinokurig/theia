/*
 * Copyright (C) 2017 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import {AbstractViewContribution, FrontendApplication, OpenerService, WidgetManager} from "@theia/core/lib/browser";
import {PreferencesWidget} from "./preferences-widget";
import {inject} from "inversify";
import {Command, CommandRegistry, MessageService, SelectionService} from "@theia/core";
import {FileSystem} from "@theia/filesystem/lib/common";
import URI from "@theia/core/lib/common/uri";

export const PREFERENCES_WIDGET_ID = 'preferences_widget';

export namespace PreferencesCommands {
    export const OPEN_WIDGET: Command = {
        id: 'preferences:widget',
        label: 'Preferences: Open widget ...'
    };
}

export class PreferencesViewContribution extends AbstractViewContribution<PreferencesWidget> {
    constructor(
        @inject(SelectionService) protected readonly selectionService: SelectionService,
        @inject(WidgetManager) protected readonly widgetManager: WidgetManager,
        @inject(FrontendApplication) protected readonly app: FrontendApplication,
        @inject(FileSystem) protected readonly fileSystem: FileSystem,
        @inject(OpenerService) protected openerService: OpenerService,
        @inject(MessageService) protected readonly notifications: MessageService
    ) {
        super({
            widgetId: PREFERENCES_WIDGET_ID,
            widgetName: 'Preferences',
            defaultWidgetOptions: {
                area: 'main',
                mode: 'split-right',
                rank: 500
            },
            toggleKeybinding: 'ctrlcmd+shift+y'
        });
    }

    async showWidget(): Promise<PreferencesWidget> {
        const widget = await this.widget;
        await widget.update();
        return this.openView({
            activate: true
        });
    }

    registerCommands(commands: CommandRegistry): void {
        commands.registerCommand(PreferencesCommands.OPEN_WIDGET, {
            execute: () => {
                const uri = new URI().withScheme('file').withQuery("preferences");
                this.openerService.getOpener(uri).then(result => {
                    result.open(new URI());
                });
            }
        });
    }
}
